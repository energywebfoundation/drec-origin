import { Injectable, NotFoundException, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  CertificateService,
  CERTIFICATE_SERVICE_TOKEN,
  IIssueCommandParams,
  IIssuedCertificate,
  ITransferCommand,
} from '@energyweb/origin-247-certificate';
import { ICertificateMetadata } from '../../utils/types';
import { DateTime } from 'luxon';
import {
  FilterDTO,
  ReadsService as BaseReadsService,
} from '@energyweb/energy-api-influxdb';
import { DeviceService } from '../device/device.service';
import { BASE_READ_SERVICE } from '../reads/const';
import { OrganizationService } from '../organization/organization.service';
import { DeviceGroupService } from '../device-group/device-group.service';
import { IDevice } from '../../models';
import { DeviceGroup } from '../device-group/device-group.entity';
import { DeviceGroupNextIssueCertificate } from '../device-group/device_group_issuecertificate.entity'
import { AnyARecord } from 'dns';

@Injectable()
export class IssuerService {
  private readonly logger = new Logger(IssuerService.name);

  constructor(
    private groupService: DeviceGroupService,
    private deviceService: DeviceService,
    private organizationService: OrganizationService,
    @Inject(CERTIFICATE_SERVICE_TOKEN)
    private readonly certificateService: CertificateService<ICertificateMetadata>,
    @Inject(BASE_READ_SERVICE)
    private baseReadsService: BaseReadsService,
  ) { }

  // @Cron(CronExpression.EVERY_30_SECONDS)
  // @Cron('0 00 21 * * *') // Every day at 23:30 - Server Time
  // async handleCron(): Promise<void> {
  //   this.logger.debug('Called every day at 23:30 Server time');

  //   const startDate = DateTime.now().minus({ days: 1 }).toUTC();
  //   const endDate = DateTime.now().minus({ minute: 1 }).toUTC();

  //   this.logger.debug(`Start date ${startDate} - End date ${endDate}`);

  //   const groups = await this.groupService.getAll();
  //   await Promise.all(
  //     groups.map(async (group: DeviceGroup) => {


  //       group.devices = await this.deviceService.findForGroup(group.id);
  //       const organization = await this.organizationService.findOne(
  //         group.organizationId,
  //       );
  //       group.organization = {
  //         name: organization.name,
  //         blockchainAccountAddress: organization.blockchainAccountAddress,
  //       };
  //       return await this.issueCertificateForGroup(group, startDate, endDate);
  //     }),
  //   );
  // }
  @Cron(' */2 * * * *')
  async handleCron(): Promise<void> {
    this.logger.debug('Called every day at 23:30 Server time');

    const startDate1 = DateTime.now().minus({ days: 1 }).toUTC();
    const endDate1 = DateTime.now().minus({ minute: 1 }).toUTC();

    this.logger.debug(`Start date ${startDate1} - End date ${endDate1}`);

    const groupsrequestall = await this.groupService.getAllNextrequestCertificate();
    this.logger.debug(groupsrequestall);
    await Promise.all(
      groupsrequestall.map(async (grouprequest: DeviceGroupNextIssueCertificate) => {
        console.log("79");
        console.log(new Date());
        const group = await this.groupService.findOne(
          { id: grouprequest.groupId }
        );
        console.log("84");
        let start_date = new Date(grouprequest.end_date).toString();
        console.log(start_date);
        this.logger.debug('87');

        if (group) {
          // throw new NotFoundException(`No device found with id`);


          //  const requestdate = await this.groupService.getGroupiCertificateIssueDate({ groupId: group.id });
          //this.logger.debug(requestdate);

          var countryDevicegroup = await this.deviceService.NewfindForGroup(group.id);
          this.logger.debug(countryDevicegroup);
          const organization = await this.organizationService.findOne(
            group.organizationId,
          );
          group.organization = {
            name: organization.name,
            blockchainAccountAddress: organization.blockchainAccountAddress,
          };

          const startDate = DateTime.fromISO(grouprequest.start_date).toUTC();
          const endDate = DateTime.fromISO(grouprequest.end_date).toUTC();
          let start_date = endDate.toString();
          console.log(start_date);

          let hours = 1;
          if (group.frequency === 'daily') {
            hours = 1 * 24;
          } else if (group.frequency === 'Monthly') {
            hours = 30 * 24;
          } else if (group.frequency === 'weekly') {
            hours = 7 * 24;
          } else if (group.frequency === 'quarterly') {
            hours = 91 * 24;
          }
          let end_date = new Date((new Date(new Date(endDate.toString())).getTime() + (hours * 3.6e+6))).toISOString()

          console.log(end_date);
          console.log('284');
          console.log(group.reservationEndDate);
          if (new Date(end_date).getTime() < group.reservationEndDate.getTime()) {
            await this.groupService.updatecertificateissuedate(group.id, start_date, end_date);
          }
          this.logger.debug(`Start date ${startDate} - End date ${endDate}`);
         
            for (let key in countryDevicegroup) {
              console.log(`${key}: "${countryDevicegroup[key]}"`);
              console.log('98');
              group.devices = countryDevicegroup[key];
              console.log('100');
              return await this.newissueCertificateForGroup(group, startDate, endDate);
            }
            
          }

        
      }),
    );
  }

  // private groupBy(array: any, key: any): Promise<{ [key: string]: Device[] }> {
  //   console.log(array)

  //   return array.reduce((result: any, currentValue: any) => {

  //     (result[currentValue[key]] = result[currentValue[key]] || []).push(
  //       currentValue
  //     );

  //     return result;
  //   }, {});
  // };
  private async issueCertificateForGroup(
    group: DeviceGroup,
    startDate: DateTime,
    endDate: DateTime,
  ): Promise<void> {
    const readsFilter: FilterDTO = {
      offset: 0,
      limit: 1000,
      start: startDate.toString(),
      end: endDate.toString(),
    };

    if (!group?.devices?.length) {
      return;
    }
    const org = await this.organizationService.findOne(group.organizationId);
    if (!org) {
      throw new NotFoundException(
        `No organization found with code ${group.organizationId}`,
      );
    }
    const groupReads: number[] = [];
    await Promise.all(
      group.devices.map(async (device: IDevice) =>
        groupReads.push(
          await this.getDeviceFullReads(device.externalId, readsFilter),
        ),
      ),
    );
    const totalReadValue = groupReads.reduce(
      (accumulator, currentValue) => accumulator + currentValue,
      0,
    );

    if (!totalReadValue) {
      return;
    }

    const totalReadValueKw = await this.handleLeftoverReads(
      group,
      totalReadValue,
    );

    if (!totalReadValueKw) {
      return;
    }

    const issueTotalReadValue = totalReadValueKw * 10 ** 3; // Issue certificate in watts

    const deviceGroup = {
      ...group,
      devices: [],
    };
    const issuance: IIssueCommandParams<ICertificateMetadata> = {
      deviceId: group.id?.toString(), // This is the device group id not a device id
      energyValue: issueTotalReadValue.toString(),
      fromTime: new Date(startDate.toString()),
      toTime: new Date(endDate.toString()),
      toAddress: org.blockchainAccountAddress,
      userId: org.blockchainAccountAddress,
      metadata: {
        deviceIds: group.devices.map((device: IDevice) => device.id),
        deviceGroup,
        groupId: group.id?.toString() || null,
      },
    };
    this.logger.log(
      `Issuance: ${JSON.stringify(issuance)}, Group name: ${group.name}`,
    );
    const issuedCertificate = await this.issueCertificate(issuance);
    await this.transferCertificateToBuyer(group, issuedCertificate);
    return;
  }
  private async newissueCertificateForGroup(
    group: DeviceGroup,
    startDate: DateTime,
    endDate: DateTime,
  ): Promise<void> {
    const readsFilter: FilterDTO = {
      offset: 0,
      limit: 1000,
      start: startDate.toString(),
      end: endDate.toString(),
    };
    console.log("240");
    console.log(readsFilter);
    if (!group?.devices?.length) {
      return;
    }
    const org = await this.organizationService.findOne(group.organizationId);
    if (!org) {
      throw new NotFoundException(
        `No organization found with code ${group.organizationId}`,
      );
    }
    const groupReads: number[] = [];
    await Promise.all(
      group.devices.map(async (device: IDevice) =>
        groupReads.push(
          await this.getDeviceFullReads(device.externalId, readsFilter),
        ),
      ),
    );
    console.log(groupReads);
    const totalReadValue = groupReads.reduce(
      (accumulator, currentValue) => accumulator + currentValue,
      0,
    );

    if (!totalReadValue) {
      return;
    }

    const totalReadValueKw = await this.handleLeftoverReads(
      group,
      totalReadValue,
    );

    if (!totalReadValueKw) {
      return;
    }

    const issueTotalReadValue = totalReadValueKw * 10 ** 3; // Issue certificate in watts

    const deviceGroup = {
      ...group,
      devices: [],
    };
    if (

      !group.buyerAddress ||
      !group.buyerId ||
      !group.organization?.blockchainAccountAddress
    ) {
      return;
    }
    const issuance: IIssueCommandParams<ICertificateMetadata> = {
      deviceId: group.id?.toString(), // This is the device group id not a device id
      energyValue: issueTotalReadValue.toString(),
      fromTime: new Date(startDate.toString()),
      toTime: new Date(endDate.toString()),
      toAddress: group.buyerAddress,
      userId: group.buyerAddress,
      metadata: {
        deviceIds: group.devices.map((device: IDevice) => device.id),
        deviceGroup,
        groupId: group.id?.toString() || null,
      },
    };
    this.logger.log(
      `Issuance: ${JSON.stringify(issuance)}, Group name: ${group.name}`,
    );
    const issuedCertificate = await this.issueCertificate(issuance);



    return;
  }


  private async transferCertificateToBuyer(
    group: DeviceGroup,
    certificate: IIssuedCertificate<ICertificateMetadata>,
  ) {
    if (
      !certificate ||
      !group.buyerAddress ||
      !group.buyerId ||
      !group.organization?.blockchainAccountAddress
    ) {
      return;
    }
    this.logger.log(`Transfering a certificate`);
    const transferCommand: ITransferCommand = {
      certificateId: certificate.id,
      fromAddress: group.organization.blockchainAccountAddress,
      toAddress: group.buyerAddress,
      energyValue: certificate.energy.publicVolume,
    };
    await this.certificateService.transfer(transferCommand);
  }

  private async handleLeftoverReads(
    group: DeviceGroup,
    totalReadValueW: number,
  ): Promise<number> {
    // Logic
    // 1. Get the accummulated read values from devices
    // 2. Transform current value from watts to kw
    // 3. Add any leftover value from group to the current total value
    // 4. Separate all decimal values from the curent kw value and store it as leftover value to the device group
    // 5. Return all the integer value from the current kw value (if any) and continue issuing the certificate

    const totalReadValueKw = group.leftoverReads
      ? totalReadValueW / 10 ** 3 + group.leftoverReads
      : totalReadValueW / 10 ** 3;
    const { integralVal, decimalVal } =
      this.separateIntegerAndDecimal(totalReadValueKw);
    await this.groupService.updateLeftOverRead(group.id, decimalVal);

    return integralVal;
  }

  private separateIntegerAndDecimal(num: number): {
    integralVal: number;
    decimalVal: number;
  } {
    if (!num) {
      return { integralVal: 0, decimalVal: 0 };
    }
    const integralVal = Math.floor(num);
    const decimalVal = this.roundDecimalNumber(num - integralVal);
    return { integralVal, decimalVal };
  }

  private roundDecimalNumber(num: number): number {
    if (num === 0) {
      return num;
    }
    const precision = 2;
    return Math.round(num * 10 ** precision) / 10 ** precision;
  }

  private async getDeviceFullReads(
    meterId: string,
    filter: FilterDTO,
  ): Promise<number> {
    console.log("381")
    const allReads = await this.baseReadsService.find(meterId, filter);
    return allReads.reduce(
      (accumulator, currentValue) => accumulator + currentValue.value,
      0,
    );
  }

  private async issueCertificate(
    reading: IIssueCommandParams<ICertificateMetadata>,
  ): Promise<IIssuedCertificate<ICertificateMetadata>> {
    this.logger.log(`Issuing a certificate for reading`);
    const issuedCertificate = await this.certificateService.issue(reading);
    this.logger.log(`Issued a certificate with ID ${issuedCertificate.id}`);
    return issuedCertificate;
  }
}
