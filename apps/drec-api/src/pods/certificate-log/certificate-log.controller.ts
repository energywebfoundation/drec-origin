import {
    Controller,
    Get,
    Post,
    Patch,
    HttpStatus,
    Param,
    Body,
    UseGuards,
    ValidationPipe,
    Query,
    ConflictException,
    BadRequestException,
} from '@nestjs/common';

import {
    ApiBearerAuth,
    ApiNotFoundResponse,
    ApiResponse,
    ApiOkResponse,
    ApiSecurity,
    ApiTags,
    ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CheckCertificateIssueDateLogForDeviceEntity } from '../device/check_certificate_issue_date_log_for_device.entity'
import { CertificateLogService } from './certificate-log.service'
import { AmountFormattingDTO, FilterDTO, GroupIDBasedFilteringDTO } from './dto/filter.dto'
import { Certificate } from '@energyweb/issuer-api';
import { UserDecorator } from '../user/decorators/user.decorator';
import { ILoggedInUser } from '../../models';
import { DeviceGroupService } from '../device-group/device-group.service';
import { User } from '../user/user.entity';
import { CertificateWithPerdevicelog, CertificateNewWithPerDeviceLog,CertificatelogResponse } from './dto'
import { PowerFormatter } from '../../utils/PowerFormatter';
import { ActiveUserGuard } from '../../guards/ActiveUserGuard';
import { PermissionGuard } from '../../guards/PermissionGuard';
import { Permission } from '../permission/decorators/permission.decorator';
import { ACLModules } from '../access-control-layer-module-service/decorator/aclModule.decorator';
import { deviceFilterDTO } from './dto/deviceFilter.dto';
import { Role } from '../../utils/enums';
import { OrganizationService } from '../organization/organization.service';
import { UserService } from '../user/user.service';

/*
* It is Controller of ACL Module with the endpoints of ACL module operations.
*/
@ApiTags('certificate-log')
@ApiBearerAuth('access-token')
@ApiSecurity('drec')
@Controller('/certificate-log')
export class CertificateLogController {

    constructor(
        private readonly certificateLogService: CertificateLogService,
        private readonly devicegroupService: DeviceGroupService,
        private readonly organizationService: OrganizationService,
        private readonly userService: UserService,
    ) { }

    /*
    * It is GET api to list all certificate issues date log of devices.
    * @return { Array<CheckCertificateIssueDateLogForDeviceEntity> } returns all issue logs of device
    */
    @Get()
    @UseGuards(AuthGuard('jwt'),PermissionGuard)
    @Permission('Read')
    @ACLModules('CERTIFICATE_LOG_MANAGEMENT_CRUDL')
    @ApiOkResponse({ type: [CheckCertificateIssueDateLogForDeviceEntity], description: 'Returns all individual devices certificate log' })
    async getAll(
    ): Promise<CheckCertificateIssueDateLogForDeviceEntity[]> {
        return this.certificateLogService.find();
    }

    /*
    * Need to ask Namrata
    */
    @Get('/claim-amount-in-ethers-json')
    @UseGuards(PermissionGuard)
    @Permission('Read')
    @ACLModules('CERTIFICATE_LOG_MANAGEMENT_CRUDL')
    async getClaimAmountInEthersJSON(
        @Query() amountFormatData: AmountFormattingDTO,
    ) {
        if (Number.isNaN(parseInt(amountFormatData.amount))) {
            return new Promise((resolve, reject) => {
                reject(new ConflictException({
                    success: false,
                    message: 'amount invalid value was sent',
                }))
            })

        }
        return PowerFormatter.getBaseValueFromValueInDisplayUnitInEthers(amountFormatData.amount)
    }

    /*
    * It is GET api to list the  cerficate log of devices filtered by groupId
    * @return { Array<CheckCertificateIssueDateLogForDeviceEntity> } returns the logs of certicates
    */
    @Get('/by-reservation-groupId')
    @UseGuards(AuthGuard('jwt'),PermissionGuard)
    @Permission('Read')
    @ACLModules('CERTIFICATE_LOG_MANAGEMENT_CRUDL')
    @ApiOkResponse({ type: [CheckCertificateIssueDateLogForDeviceEntity], description: 'Returns Certificate logs For individual devices based on groupId' })
    async getByGroupId(
        @Query(ValidationPipe) filterDto: GroupIDBasedFilteringDTO,
    ): Promise<CheckCertificateIssueDateLogForDeviceEntity[]> {
        if (parseInt(filterDto.groupId) === NaN) {
            return new Promise((resolve, reject) => {
                reject(new ConflictException({
                    success: false,
                    message: 'Group Id is a number, invalid value was sent',
                }))
            })

        }
        return this.certificateLogService.findByGroupId(filterDto.groupId);
    }

    /**
    * It is GET api to list issuer certificates of groupId
    * @return { Array<CertificateNewWithPerDeviceLog> } returns issuer certicates of groupId
    * @param { groupUid } is an uniqueId in the certificate log from reservation
    */
    @Get('/issuer/certified/:groupUid')
    @UseGuards(AuthGuard('jwt'),PermissionGuard)
    @Permission('Read')
    @ACLModules('CERTIFICATE_LOG_MANAGEMENT_CRUDL')
    @ApiOkResponse({ type: [CertificateNewWithPerDeviceLog], description: 'Returns issuer Certificate of groupId' })
    async getissueCertificate(
        @Param('groupUid') groupuId: string,
        @UserDecorator() user: ILoggedInUser,
    ): Promise<CertificateNewWithPerDeviceLog[]> {
        console.log("101")
        const regexExp = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/;
        //console.log(regexExp.test(groupuId));
        if (groupuId === null || !regexExp.test(groupuId)) {
            return new Promise((resolve, reject) => {
                reject(new ConflictException({
                    success: false,
                    message: ' Please Add the valid UID ,invalid group uid value was sent',
                }))
            })
        }
        const devicegroup = await this.devicegroupService.findOne({ devicegroup_uid: groupuId })
        //console.log("devicegroup");
        //console.log(devicegroup);


        if (devicegroup === null || devicegroup.buyerId != user.id) {
            return new Promise((resolve, reject) => {
                reject(new ConflictException({
                    success: false,
                    message: 'Group UId is not of this buyer, invalid value was sent',
                }))
            })
        }
        // setTimeout(() => {

        // }, 2000)
        return await this.certificateLogService.getCertificateFromOldOrNewUfinction(devicegroup.id.toString());
    }

    /*
    * It is GET api to list issuer certificates of groupId
    * @return { Array<CertificateNewWithPerDeviceLog> } returns issuer certicates of groupId
    * @param { groupid } Need to ask Namrata
    */
    @Get('/issuer/certified/new/:groupUid')
    @UseGuards(AuthGuard('jwt'),PermissionGuard)
    @Permission('Read')
    @ACLModules('CERTIFICATE_LOG_MANAGEMENT_CRUDL')
    @ApiOkResponse({ type: [CertificateNewWithPerDeviceLog], description: 'Returns issuer Certificate of groupId' })
    async getCertificatesFromUpdatedCertificateTables(
        @Param('groupUid') groupuId: string,
        @UserDecorator() user: ILoggedInUser,
    ): Promise<CertificateNewWithPerDeviceLog[]> {
        console.log("138")
        const regexExp = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/;
        if (groupuId === null || !regexExp.test(groupuId)) {
            return new Promise((resolve, reject) => {
                reject(new ConflictException({
                    success: false,
                    message: ' Please Add the valid UID ,invalid group uid value was sent',
                }))
            })
        }
        const devicegroup = await this.devicegroupService.findOne({ devicegroup_uid: groupuId })
        if (devicegroup === null || devicegroup.buyerId != user.id) {
            return new Promise((resolve, reject) => {
                reject(new ConflictException({
                    success: false,
                    message: 'Group UId is not of this buyer, invalid value was sent',
                }))
            })
        }

        return this.certificateLogService.getCertificateFromOldOrNewUfinction(devicegroup.id.toString());
    }

    /**
    * This is GET api used in previous version of Drec, after claiming certicate user can view the redemption report
    */
    @Get('/redemption-report')
    @UseGuards(AuthGuard('jwt'),PermissionGuard)
    @Permission('Read')
    @ACLModules('CERTIFICATE_LOG_MANAGEMENT_CRUDL')
    @ApiOkResponse
        ({
            status: HttpStatus.OK,
            description: 'Returns a new created Device id'
        })
    async getRedemptionReport(
        @UserDecorator() { id }: ILoggedInUser,
    ): Promise<any[]> {
        return this.certificateLogService.getCertificateRedemptionReport(id);
    }


    // @Get('/missingCertificate')
    // findAll() {
    //     return this.certificateLogService.getmissingtoken();
    // }


    /*
    * It is GET api to list all the readings of organization witn pagination and filered by device
    */
    @Get('/certificateReadModule')
    @UseGuards(AuthGuard('jwt'), ActiveUserGuard, PermissionGuard)
    @Permission('Read')
    @ACLModules('CERTIFICATE_LOG_MANAGEMENT_CRUDL')
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Returns the certificate_read_module table',
    })
    @ApiQuery({
        name: 'certificateStartDate',
        required: false,
    })
    @ApiQuery({
        name: 'certiifcateEndDate',
        required: false,
    })
    @ApiQuery({
        name: 'pageNumber',
        type: Number,
        required: true,
    })
    @ApiQuery({
        name: 'targetVolumeCertificateGenerationRequestedInMegaWattHour',
        type: Number,
        required: false,
    })
    @ApiQuery({
        name: 'deviceFilter',
        type: Object,
        required: false,
    })
    async GetCertificateReadModule(
        @UserDecorator() { organizationId }: ILoggedInUser,
        @Query('pageNumber') pageNumber: number,
        @Query('certificateStartDate') generationStartTime?: string,
        @Query('certiifcateEndDate') generationEndTime?: string,
        @Query('targetVolumeCertificateGenerationRequestedInMegaWattHour') targetVolumeCertificateGenerationRequestedInMegaWattHour?: number,
        @Query('deviceFilter') deviceFilter?: deviceFilterDTO,
    ) {
        return await this.certificateLogService.getsCertificateReadModule(
            organizationId.toString(),
            pageNumber,
            deviceFilter,
            generationStartTime,
            generationEndTime,
            targetVolumeCertificateGenerationRequestedInMegaWattHour,
        );
    }

    /*
    * It is GET api to fetch certificate log of reserved device.
    * @retrurn {CertificatelogResponse} return an certificate log an reservred device.
    */ 
    /* for developre*/
    @Get('/issuer/certifiedlogOfdevices')
    @UseGuards(AuthGuard('jwt'), AuthGuard('oauth2-client-password'), PermissionGuard)
    @Permission('Read')
    @ACLModules('CERTIFICATE_LOG_MANAGEMENT_CRUDL')
    @ApiQuery({ name: 'organizationId', type: Number, required: false, description : 'This query parameter is for apiuser' })
    @ApiOkResponse({ type: [CertificatelogResponse], description: 'Returns issuer Certificate of Reservation' })
    async getCertificatesForDeveloper(

        @UserDecorator() user: ILoggedInUser,
        @Query(ValidationPipe) filterDto: FilterDTO,
        @Query('pageNumber') pageNumber: number,
        @Query('organizationId') organizationId: number,
    ): Promise<CertificatelogResponse> {
        console.log("238");
        if(organizationId) {
            if(user.role === Role.ApiUser) {
                const organization = await this.organizationService.findOne(organizationId);
                const orguser = await this.userService.findByEmail(organization.orgEmail);

                if(organization.api_user_id != user.api_user_id) {
                    throw new BadRequestException({
                        success: false,
                        message: 'Organization requested belongs to other apiuser',
                    });
                }
                else {
                    user.organizationId = organizationId;
                    user.role = orguser.role;
                }
            } 
            else {
                if(organizationId != user.organizationId) {
                    throw new BadRequestException({
                        success: false,
                        message: 'Organization requested belongs to other organization',
                    });
                }
            }
        }
            
        return this.certificateLogService.getCertifiedlogofDevices(user, filterDto, pageNumber);
    }
}
