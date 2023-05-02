
import {
  Injectable,
  NotFoundException,
  NotAcceptableException,
  Logger,
  ConflictException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { CheckCertificateIssueDateLogForDeviceEntity } from '../device/check_certificate_issue_date_log_for_device.entity'
import { getManager, FindOneOptions, Repository, In, IsNull, Not, Brackets, SelectQueryBuilder, FindConditions, FindManyOptions, Between, LessThanOrEqual, EntityManager } from 'typeorm';
import { FilterDTO } from './dto/filter.dto';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import cleanDeep from 'clean-deep';
import { Device } from '../device/device.entity';
import { Certificate } from '@energyweb/issuer-api';
import { DeviceService } from '../device/device.service';
import { DateTime } from 'luxon';
import { CertificateNewWithPerDeviceLog, CertificateWithPerdevicelog } from './dto'
import { DeviceGroupService } from '../device-group/device-group.service';
import { DeviceGroupDTO } from '../device-group/dto'
import { grouplog } from './grouplog';
import { issuercertificatelog } from './issuercertificate';
import { OffChainCertificateService, IGetAllCertificatesOptions, ICertificateReadModel } from '@energyweb/origin-247-certificate';
import { ICertificateMetadata } from '../../utils/types';

import { CertificateReadModelEntity } from '@energyweb/origin-247-certificate/dist/js/src/offchain-certificate/repositories/CertificateReadModel/CertificateReadModel.entity';
import { DeviceGroup } from '../device-group/device-group.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { time } from 'console';

export interface newCertificate extends Certificate {
  perDeviceCertificateLog: CheckCertificateIssueDateLogForDeviceEntity
}
@Injectable()
export class CertificateLogService {
  private readonly logger = new Logger(CertificateLogService.name);

  constructor(
    @InjectRepository(CheckCertificateIssueDateLogForDeviceEntity) private readonly repository: Repository<CheckCertificateIssueDateLogForDeviceEntity>,

    @InjectRepository(Certificate) private readonly certificaterrepository: Repository<Certificate>,

    @InjectRepository(CertificateReadModelEntity) private readonly cretificatereadmoduleRepository,

    @InjectRepository(DeviceGroup) private readonly deviceGroupRepository,
    @InjectEntityManager() private readonly manager: EntityManager,

    private deviceService: DeviceService,
    private devicegroupService: DeviceGroupService,
    private readonly offChainCertificateService: OffChainCertificateService<ICertificateMetadata>,
    
  ) { }

  public async find(): Promise<CheckCertificateIssueDateLogForDeviceEntity[]> {
    // const query = this.getFilteredQuery(filterDto);
    return this.repository.find();
  }


  public async findByGroupId(groupId: string): Promise<CheckCertificateIssueDateLogForDeviceEntity[]> {
    // const query = this.getFilteredQuery(filterDto);
    return this.repository.find({
      where: {
        groupId
      },
    });
  }

  //   private getFilteredQuery(filter: FilterDTO): FindManyOptions<CheckCertificateIssueDateLogForDeviceEntity> {
  //     const where: FindConditions<CheckCertificateIssueDateLogForDeviceEntity> = cleanDeep({

  //         certificate_issuance_startdate:
  //         filter.start_date &&
  //         filter.end_date &&
  //         Between(filter.start_date, filter.end_date),

  //     });
  //     const query: FindManyOptions<CheckCertificateIssueDateLogForDeviceEntity> = {
  //       where

  //     };
  //     return query;
  //   }

  //   private getFilteredQuery(filterDto: UserFilterDTO): SelectQueryBuilder<User> {
  //     const { organizationName, status } = filterDto;
  //     const query = this.repository
  //       .createQueryBuilder('user')
  //       .leftJoinAndSelect('user.organization', 'organization');
  //     if (organizationName) {
  //       const baseQuery = 'organization.name ILIKE :organizationName';
  //       query.andWhere(baseQuery, { organizationName: `%${organizationName}%` });
  //     }
  //     if (status) {
  //       query.andWhere(`user.status = '${status}'`);
  //     }
  //     return query;
  //   }

  async Findcertificatelog(filterDto: FilterDTO): Promise<CheckCertificateIssueDateLogForDeviceEntity[]> {
    const totalExamNumbers: any = getManager().createQueryBuilder()
      .select("d.externalId", "externalId")
      .addSelect("(COUNT(dl.id))", "total")
      .from(CheckCertificateIssueDateLogForDeviceEntity, "dl")
      .leftJoin(Device, "d", "dl.deviceid = d.externalId")
      .where('d.organizationId = :orgid', { orgid: 3 })
      .andWhere("dl.readvalue_watthour>0")
      .groupBy("d.externalId");
    //console.log(totalExamNumbers.getQuery())
    const devicelog = await totalExamNumbers.getRawMany();
    //console.log(devicelog)

    return devicelog;

  }


  async getfindreservationcertified(groupid: string): Promise<CertificateWithPerdevicelog[]> {
    const certifiedreservation = await this.certificaterrepository.find(
      {
        where: {
          deviceId: groupid,
          // claims:IsNull()
        }
      })
    console.log(certifiedreservation);

    const res = await Promise.all(
      certifiedreservation.map(async (certifiedlist: CertificateWithPerdevicelog) => {
        certifiedlist.certificateStartDate = new Date(certifiedlist.generationStartTime * 1000).toISOString();
        certifiedlist.certificateEndDate = new Date(certifiedlist.generationEndTime * 1000).toISOString();
        certifiedlist.perDeviceCertificateLog = [];

        try {
          JSON.parse(certifiedlist.metadata);
        }
        catch (e) {
          console.error(e, "certificate doesnt contains valid metadta", certifiedlist);
          return;
        }
        const obj = JSON.parse(certifiedlist.metadata);
        //console.log("getdate", certifiedlist.generationStartTime, certifiedlist.generationEndTime)
        /* Please see note below regarding generationStartTime
        node_modules\@energyweb\origin-247-certificate\dist\js\src\certificate.service.js
            async issue(params) {
            const command = {
                ...params,
                fromTime: Math.round(params.fromTime.getTime() / 1000),
                toTime: Math.round(params.toTime.getTime() / 1000)
            };
            const job = await this.blockchainActionsQueue.add({
                payload: command,
                type: types_1.BlockchainActionType.Issuance
            }, jobOptions);
            const result = await this.waitForJobResult(job);
            return this.mapCertificate(result);
            }
         */
        const devicereadstartdate = new Date((certifiedlist.generationStartTime - 1) * 1000);//as rounding when certificate is issued by EWFs package reference kept above and removing millseconds 
        const devicereadenddate = new Date((certifiedlist.generationEndTime + 1) * 1000);//going back 1 second in start and going forward 1 second in end
        //console.log("changegetdate", devicereadstartdate, devicereadenddate)
        await Promise.all(
          obj.deviceIds.map(async (deviceid: number) => {
            const device = await this.deviceService.findOne(deviceid);
            const devicelog = await this.getCheckCertificateIssueDateLogForDevice(parseInt(groupid), device.externalId, devicereadstartdate, devicereadenddate);
            console.log(devicelog)
            devicelog.forEach(async (singleDeviceLogEle) => {
              singleDeviceLogEle.deviceid = device.developerExternalId
              certifiedlist.perDeviceCertificateLog.push(singleDeviceLogEle);

            });
            //   return devicelog;
          })
        );
       
        return certifiedlist;
      }),
    );
    console.log(res)
    return res;
  }

  async getCertificatesUsingGroupIDVersionUpdateOrigin247(groupid: string): Promise<CertificateNewWithPerDeviceLog[]> {
    let request: IGetAllCertificatesOptions = {
      // generationEndFrom: new Date(1677671426*1000),
      // generationEndTo: new Date(1677671426*1000),
      //  generationStartFrom :new Date(1646622684*1000),
      // generationStartTo: new Date(1648159894*1000),
      // creationTimeFrom: Date;
      //  creationTimeTo: Date;
      deviceId: groupid
    }
    const certifiedreservation: ICertificateReadModel<ICertificateMetadata>[] = await this.offChainCertificateService.getAll(request);
    let certificatesInReservationWithLog: Array<CertificateNewWithPerDeviceLog> = [];
    certifiedreservation.forEach(ele => certificatesInReservationWithLog.push({ ...ele, perDeviceCertificateLog: [], certificateStartDate: '', certificateEndDate: '' }));

    console.log(certifiedreservation);

    await Promise.all(
      certifiedreservation.map(async (certifiedlist: ICertificateReadModel<ICertificateMetadata>, index: number) => {
        certificatesInReservationWithLog[index].certificateStartDate = new Date(certifiedlist.generationStartTime * 1000).toISOString();
        certificatesInReservationWithLog[index].certificateEndDate = new Date(certifiedlist.generationEndTime * 1000).toISOString();
        certificatesInReservationWithLog[index].perDeviceCertificateLog = [];
        try {
          if (typeof certifiedlist.metadata === "string") {
            let data = JSON.parse(certifiedlist.metadata);
          }
        }
        catch (e) {
          console.error(e, "certificate doesnt contains valid metadata", certifiedlist);
          return;
        }

        let obj;
        if (typeof certifiedlist.metadata === "string") {
          obj = JSON.parse(certifiedlist.metadata);
        }
        else {
          obj = certifiedlist.metadata;
        }

        let certificateTransactionUID = obj.certificateTransactionUID;
        //console.log("getdate", certifiedlist.generationStartTime, certifiedlist.generationEndTime)
        /* Below note can be ignored for newer certificates as we added certificateTransactionUID which will overcome this issue as well
        Please see note below regarding generationStartTime
        node_modules\@energyweb\origin-247-certificate\dist\js\src\certificate.service.js
            async issue(params) {
            const command = {
                ...params,
                fromTime: Math.round(params.fromTime.getTime() / 1000),
                toTime: Math.DeviceGroupound(params.toTime.getTime() / 1000)
            };
            const job = await this.blockchainActionsQueue.add({
                payload: command,
                type: types_1.BlockchainActionType.Issuance
            }, jobOptions);
            const result = await this.waitForJobResult(job);
            return this.mapCertificate(result);
            }
         */
        const devicereadstartdate = new Date((certifiedlist.generationStartTime - 1) * 1000);//as rounding when certificate is issued by EWFs package reference kept above and removing millseconds 
        const devicereadenddate = new Date((certifiedlist.generationEndTime + 1) * 1000);//going back 1 second in start and going forward 1 second in end
        //console.log("changegetdate", devicereadstartdate, devicereadenddate)
        await Promise.all(
          obj.deviceIds.map(async (deviceid: number) => {
            const device = await this.deviceService.findOne(deviceid);
            const devicelog = await this.getCheckCertificateIssueDateLogForDevice(parseInt(groupid), device.externalId, devicereadstartdate, devicereadenddate, certificateTransactionUID);
            devicelog.forEach(singleDeviceLogEle => {
              certificatesInReservationWithLog[index].perDeviceCertificateLog.push(singleDeviceLogEle);
            });
            //console.log(certifiedlist)
            return devicelog;
          })
        );
        //console.log("perDeviceCertificateLog");
        return certificatesInReservationWithLog[index];
      }),
    );
    return certificatesInReservationWithLog;
  }

  public async getCheckCertificateIssueDateLogForDevice(groupId: number, deviceid: string,
    startDate: Date,
    endDate: Date, certificateTransactionUID?: string): Promise<CheckCertificateIssueDateLogForDeviceEntity[]> {
    try {
      let devicelog;

      if (certificateTransactionUID) {
        devicelog = await this.getDevicelogFromTransactionUID(groupId, deviceid, certificateTransactionUID);
        return devicelog;
      }
      else {
        const query = this.getdevicelogFilteredQueryWithGroupID(groupId, deviceid,
          startDate,
          endDate);
        devicelog = await query.getRawMany();
      }
      const reservedevices = await devicelog.map((s: any) => {
        const item: any = {
          id: s.issuelog_id,
          certificate_issuance_startdate: s.issuelog_certificate_issuance_startdate,
          certificate_issuance_enddate: s.issuelog_certificate_issuance_enddate,
          readvalue_watthour: s.issuelog_readvalue_watthour,
          status: s.issuelog_status,
          deviceid: s.issuelog_deviceid,
          groupId: s.issuelog_groupId
        };
        console.log(item);
        return item;
      });
      console.log(reservedevices)
      return reservedevices;
    } catch (error) {
      console.log(error)
      this.logger.error(`Failed to retrieve device`, error.stack);
    }
  }
  private getdevicelogFilteredQueryWithGroupID(groupId: number, deviceid: string,
    startDate: Date,
    endDate: Date): SelectQueryBuilder<CheckCertificateIssueDateLogForDeviceEntity> {
    const query = this.repository
      .createQueryBuilder("issuelog").
      where("issuelog.deviceId = :deviceid", { deviceid: deviceid })
      .andWhere(
        new Brackets((db) => {
          db.where(
            new Brackets((db1) => {
              db1.where("issuelog.certificate_issuance_startdate BETWEEN :DeviceReadingStartDate1  AND :DeviceReadingEndDate1", { DeviceReadingStartDate1: startDate, DeviceReadingEndDate1: endDate })
                .orWhere("issuelog.certificate_issuance_startdate = :DeviceReadingStartDate", { DeviceReadingStartDate: startDate })
            })
          )
            .andWhere(
              new Brackets((db2) => {
                db2.where("issuelog.certificate_issuance_enddate  BETWEEN :DeviceReadingStartDate2  AND :DeviceReadingEndDate2", { DeviceReadingStartDate2: startDate, DeviceReadingEndDate2: endDate })
                  .orWhere("issuelog.certificate_issuance_enddate = :DeviceReadingEndDate ", { DeviceReadingEndDate: endDate })
              })
            )
        }),
      )
      .andWhere("issuelog.groupId = :groupId", { groupId: groupId })
    return query;
  }

  private getDevicelogFromTransactionUID(groupId: number, deviceId: string,
    certificateTransactionUID: string
  ): Promise<CheckCertificateIssueDateLogForDeviceEntity[]> {
    return this.repository.find(
      {
        where: {
          groupId: groupId,
          deviceid: deviceId,
          certificateTransactionUID: certificateTransactionUID
        }
      })

  }


  async getCertificaterForRedemptionRepot(groupid: string): Promise<Certificate[]> {
    const certifiedreservation = await this.certificaterrepository.find(
      {
        where: {
          deviceId: groupid,
          claims: Not(IsNull())
        }
      })
    return certifiedreservation;
  }
  async getCertificateRedemptionReport(buyerId: number): Promise<any[]> {
    const devicegroups = await this.devicegroupService.getBuyerDeviceGroups(buyerId);
    //console.log(devicegroups);
    const myredme = [];
    const res = await Promise.all(
      devicegroups.map(async (devicegroup: DeviceGroupDTO) => {
        console.log(devicegroup.id.toString());
        const cert = await this.getCertificaterForRedemptionRepot(devicegroup.id.toString());
        //console.log(cert)
        const res1 = await Promise.all(
          cert.map(async (claimcertificate: Certificate) => {
            //console.log("datas")
            //console.log(claimcertificate);
            const res2 = await Promise.all(
              claimcertificate.claims.map(async (claims: any) => {
                console.log(claims.claimData);
              
                myredme.push({
                  compliance: 'I-REC',
                  certificateId: claimcertificate.id,
                  fuelCode: devicegroup?.fuelCode.toString().split(','),
                  country: devicegroup?.countryCode.toString().split(','),
                  capacityRange: devicegroup?.capacityRange,
                  // installations: devicegroup?.installationConfigurations ? devicegroup?.installationConfigurations.join().replace(',', ', ') : '',
                  offTakers: devicegroup?.offTakers.join().replace(',', ' ,').toString().split(','),
                  // sectors: devicegroup?.sectors ? devicegroup?.sectors.join().replace(',', ', ') : '',
                  commissioningDateRange: devicegroup?.commissioningDateRange
                    .join().replace(',', ', '),
                  //standardCompliance: devicegroup?.standardCompliance,
                  redemptionDate: claims.claimData.periodStartDate.substring(claims.claimData.periodStartDate.indexOf(":") + 1),
                  certifiedEnergy: claims.value / 10 ** 6,
                  beneficiary: claims.claimData.beneficiary.substring(claims.claimData.beneficiary.indexOf(":") + 1),
                  beneficiary_address: claims.claimData.location.substring(claims.claimData.location.indexOf(":") + 1),
                  claimCoiuntryCode: claims.claimData.countryCode.substring(claims.claimData.countryCode.indexOf(":") + 1),
                  purpose: claims.claimData.purpose.substring(claims.claimData.purpose.indexOf(":") + 1)
                });
              }),
            );
          }),
        );

      }),
    );
    //console.log(res);
    return myredme;
  }


  // async getmissingtoken() {
  //   const grouploglist = grouplog;
  //   // console.log(grouploglist);
  //   const issuerlistlist = issuercertificatelog;
  //   //  console.log(issuerlistlist);
  //   const missingtoken = [];
  //   issuerlistlist.map((issuertoken: any) => {
  //     console.log("issuertoken");
  //     // console.log(issuertoken.owners);
  //     //let issuertokenvalue= JSON.parse(issuertoken.owners);
  //     var issuertokenvalue = JSON.parse(issuertoken.owners);
  //     //  console.log(issuertokenvalue);
  //     var value = issuertokenvalue["0x320Bbee0D0CE23302eDDb2707B2DdED3e49E4437"];
  //      console.log(value);
  //     // let firstKey = Object.keys(issuertokenvalue)[0];
  //     // let firstKeyValue = issuertokenvalue[firstKey];
  //     // issuertokenvalue[key]
  //     //   console.log(firstObj);
  //     //   let firstKey = Object.keys(firstObj);
  //     //   console.log(firstKey);
  //     //  // let issuertokenvalue = issuertoken.owners[firstKey];
  //     //   // let issuertokenvalue = Object.values(issuertoken.owners);
  //     // console.log(firstKeyValue);
  //     var foundEle =  grouploglist.find(ele => ele.readvalue_watthour != value);
  //     if(foundEle){
  //       missingtoken.push({
  //         token: foundEle.readvalue_watthour,
  //         foundEle
  //       });
  //     }


  //   });
  //   console.log(missingtoken);
  //   return missingtoken
  // }

    
      
      // async getsCertificateReadModule(userOrgId: string, generationStartTime, generationEndTime, pageNumber: number) {
      //   if (pageNumber <= 0) {
      //     throw new HttpException('Invalid page number', HttpStatus.BAD_REQUEST);
      //   }
      
      //   generationStartTime = new Date(generationStartTime).getTime() / 1000;
      //   generationEndTime = new Date(generationEndTime).getTime() / 1000;
      
      //   const queryBuilder = this.cretificatereadmoduleRepository.createQueryBuilder('certificate_read_module')
      //     .innerJoin('DeviceGroup', 'dg', 'certificate_read_module.deviceId = CAST(dg.Id AS character varying)')
      //     .andWhere('dg.organizationId = :userOrgId', { userOrgId });
      
      //   if (generationStartTime && generationEndTime) {
      //     queryBuilder.andWhere('certificate_read_module.generationStartTime <= :generationEndTime', {
      //       generationEndTime: generationEndTime,
      //     })
      //       .andWhere('certificate_read_module.generationEndTime >= :generationStartTime', {
      //         generationStartTime: generationStartTime,
      //       });
      //   }
      
      //   const limit = 10;
      //   const offset = (pageNumber - 1) * limit;
      
      //   const [results, totalCount] = await queryBuilder
      //     .skip(offset)
      //     .take(limit)
      //     .getManyAndCount();
      
      //   const totalPages = Math.ceil(totalCount / limit);
      
      //   if (pageNumber > totalPages) {
      //     throw new HttpException('Page number out of range', HttpStatus.NOT_FOUND);
      //   }
      
      //   for (const result of results) {
      //     const deviceGroup = await this.deviceGroupRepository.findOne({ id: result.deviceId });
      //     result.deviceGroup = deviceGroup;
      
      //     // Parse metadata as JSON
      //     result.metadata = JSON.parse(result.metadata);
      //   }
      
      //   return {
      //     "results": results,
      //     "pageNumber": pageNumber,
      //     "totalPages": totalPages,
      //   };
      // }
      
//  @Cron(CronExpression.EVERY_30_SECONDS)
async getsCertificateReadModule(userOrgId: string, pageNumber: number, generationStartTime?: string, generationEndTime?: string, targetVolumeCertificateGenerationRequestedInMegaWattHour?: number) {
  const pageSize = 10;

  if (pageNumber <= 0) {
    throw new HttpException('Invalid page number', HttpStatus.BAD_REQUEST);
  }

  const skip = (pageNumber - 1) * pageSize;

  let queryBuilder = this.cretificatereadmoduleRepository.createQueryBuilder('crm')
    .innerJoin(DeviceGroup, 'dg', 'crm.deviceId = dg.id::text')
    .andWhere('dg.organizationId = :userOrgId', { userOrgId })
    .skip(skip)
    .take(pageSize);

  if (generationStartTime && generationEndTime) {
    const startTimestamp = new Date(generationStartTime).getTime() / 1000;
    const endTimestamp = new Date(generationEndTime).getTime() / 1000;

    queryBuilder = queryBuilder.andWhere('crm.generationStartTime <= :endTimestamp', { endTimestamp })
      .andWhere('crm.generationEndTime >= :startTimestamp', { startTimestamp });
  } else if (generationStartTime) {
    const startTimestamp = new Date(generationStartTime).getTime() / 1000;

    queryBuilder = queryBuilder.andWhere('crm.generationStartTime <= :startTimestamp', { startTimestamp });
  } else if (generationEndTime) {
    const endTimestamp = new Date(generationEndTime).getTime() / 1000;

    queryBuilder = queryBuilder.andWhere('crm.generationEndTime >= :endTimestamp', { endTimestamp });
  }

  if (targetVolumeCertificateGenerationRequestedInMegaWattHour !== undefined) {
    queryBuilder = queryBuilder.andWhere('dg.targetVolumeCertificateGenerationRequestedInMegaWattHour <= :targetVolume', { targetVolume: targetVolumeCertificateGenerationRequestedInMegaWattHour });
  }

  const results = await queryBuilder.getRawMany();
  const count = await queryBuilder.getCount();

  const totalPages = Math.ceil(count / pageSize);

  if (pageNumber > totalPages) {
    throw new HttpException('Page number out of range', HttpStatus.NOT_FOUND);
  }

  const formattedResults = results.map((result) => {
    const parsedMetadata = JSON.parse(result.crm_metadata);
    return {
      ...result,
      crm_metadata: parsedMetadata,
    };
  });

  return {
    result:formattedResults,
    pageNumber: pageNumber,
    totalPages: totalPages,
    totalCount: count,
  };
}



     
    
      
}
