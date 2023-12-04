import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  forwardRef,
  Inject
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import crypto from 'crypto';
import { DateTime } from 'luxon';
import { Repository, FindConditions, } from 'typeorm';
import { MailService } from '../../mail';
import { IEmailConfirmationToken, ISuccessResponse, IUser } from '../../models';
import { EmailConfirmationResponse } from '../../utils/enums';
import { OrganizationDTO } from '../organization/dto';
import { User } from '../user/user.entity';
import { EmailConfirmation } from './email-confirmation.entity';
import { OauthClientCredentialsService } from '../user/oauth_client.service';
import { UserService } from '../user/user.service';
export interface SuccessResponse {
  success: boolean,
  message: string,
}
@Injectable()
export class EmailConfirmationService {
  private readonly logger = new Logger(EmailConfirmationService.name);

  constructor(
    @InjectRepository(EmailConfirmation)
    private readonly repository: Repository<EmailConfirmation>,
    private mailService: MailService,
    @Inject(forwardRef(() => UserService)) private readonly userService: UserService,
    private readonly oauthClientCredentialsService: OauthClientCredentialsService,
  ) { }

  public async create(user: User): Promise<EmailConfirmation | null> {
    console.log("user", user);
    const client = await this.oauthClientCredentialsService.findOneByuserid(user.api_user_id);
    console.log("client", client);
    //console.log("Client with email create:",client,(client.client_id === process.env.client_id),user.role === 'ApiUser' )
    if ((client != undefined && client.client_id === process.env.client_id) || user.role === 'ApiUser') {
      console.log("With in email conf Service")
      const exists = await this.repository.findOne({
        where: {
          user: { email: user.email }
        },
        relations: ['user']
      });

      if (exists) {
        throw new ConflictException({
          success: false,
          message: `Email confirmation for user with email ${user.email} already exists`,
        });
      }
      const { token, expiryTimestamp } = await this.generateEmailToken();
      const emailConfirmation = await this.repository.save({
        user,
        confirmed: false,
        token,
        expiryTimestamp,
      });
      // if (inviteuser) {
      //   //  await this.sendResetPasswordRequest(user.email, token);
      //   await this.sendInvitation(orgname, user.email, token);
      // } else {
      await this.sendConfirmationEmail(user.email);
      // }
      return emailConfirmation;
    }
    return null;
  }

  // create function when orguseradmin direct added by super admin so confirm email true
  public async admincreate(user: User, password: string): Promise<EmailConfirmation> {
    const exists = await this.repository.findOne({
      where: {
        user: { email: user.email }
      },
      relations: ['user']
    });

    if (exists) {
      throw new ConflictException({
        success: false,
        message: `Email confirmation for user with email ${user.email} already exists`,
      });
    }

    const { token, expiryTimestamp } = await this.generateEmailToken();

    const emailConfirmation = await this.repository.save({
      user,
      confirmed: true,
      token,
      expiryTimestamp,
    });

    await this.sendadminConfirmEmailRequest(user.email, password);

    return emailConfirmation;
  }

  async get(userId: IUser['id']): Promise<EmailConfirmation | undefined> {
    const all = await this.repository.find({ relations: ['user'] });

    return all.find((confirmation) => confirmation.user.id === userId);
  }

  async getByEmail(
    email: IUser['email'],
  ): Promise<EmailConfirmation | undefined> {
    const all = await this.repository.find({ relations: ['user'] });

    return all.find(
      (confirmation) =>
        confirmation.user.email.toLowerCase() === email.toLowerCase(),
    );
  }
  async findOne(conditions: FindConditions<EmailConfirmation>): Promise<EmailConfirmation | undefined> {
    const user = await (this.repository.findOne(conditions, {
      relations: ['user'],

    }) as Promise<EmailConfirmation> as Promise<EmailConfirmation | undefined>);



    return user;
  }
  async confirmEmail(
    token: IEmailConfirmationToken['token'],
  ): Promise<SuccessResponse> {
    const emailConfirmation = await this.repository.findOne({ token });

    if (!emailConfirmation) {
      throw new BadRequestException({
        success: false,
        message: `Email confirmation doesn't exist`,
      });
    }

    if (emailConfirmation.confirmed === true) {
      return {
        success: false,
        message: EmailConfirmationResponse.AlreadyConfirmed,
      };
    }

    if (
      emailConfirmation.expiryTimestamp < Math.floor(DateTime.now().toSeconds())
    ) {
      return {
        success: false,
        message: EmailConfirmationResponse.Expired,
      };
    }

    await this.repository.update(emailConfirmation.id, {
      confirmed: true,
    });

    return {
      success: true,
      message: EmailConfirmationResponse.Success
    }
  }

  public async sendConfirmationEmail(
    email: IUser['email'],
  ): Promise<ISuccessResponse> {
    const currentToken = await this.getByEmail(email);
    console.log(currentToken)
    if (!currentToken) {
      return {
        message: 'Token not found',
        success: false,
      };
    }

    const { id, confirmed } = currentToken;
    console.log(confirmed)
    if (confirmed === true) {
      throw new BadRequestException({
        success: false,
        message: `Email already confirmed`,
      });
    }
    let { token, expiryTimestamp } = await this.generatetoken(currentToken, id)

    await this.sendConfirmEmailRequest(email.toLowerCase(), token);

    return {
      success: true,
    };
  }

  public async ConfirmationEmailForResetPassword(
    email: IUser['email'],
  ): Promise<ISuccessResponse> {
    const currentToken = await this.getByEmail(email);
    console.log("currentToken", currentToken)
    if (!currentToken) {
      return {
        message: "Email not found or Email not registered",
        success: false,
      };
    }
    const { id, confirmed } = currentToken;
    let { token, expiryTimestamp } = await this.generatetoken(currentToken, id);

    await this.sendResetPasswordRequest(email.toLowerCase(), token, currentToken.user.role);

    return {
      success: true,
      message: 'Password Reset Mail has been sent to your register authorized Email.',
    };
  }
  public async generatetoken(currentToken, id) {

    let { token, expiryTimestamp } = currentToken;


    if (expiryTimestamp < Math.floor(DateTime.now().toSeconds())) {
      const newToken = this.generateEmailToken();
      await this.repository.update(id, newToken);

      return ({ token, expiryTimestamp } = newToken);
    } else {
      return ({ token, expiryTimestamp } = currentToken);
    }


  }
  generateEmailToken(): IEmailConfirmationToken {
    return {
      token: crypto.randomBytes(64).toString('hex'),
      expiryTimestamp: Math.floor(
        DateTime.now().plus({ hours: 8 }).toSeconds(),
      ),
    };
  }

  private async sendConfirmEmailRequest(
    email: string,
    token: string,
  ): Promise<void> {
    const url = `${process.env.UI_BASE_URL}/confirm-email?token=${token}`;

    const result = await this.mailService.send({
      to: email,
      subject: `[Origin] Confirm your email address`,
      html: `Welcome to the marketplace! Please click the link below to verify your email address: <br/> <br/> <a href="${url}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 5px;">Confirm</a>.`,
    });

    if (result) {
      this.logger.log(`Notification email sent to ${email}.`);
    }
  }

  private async sendadminConfirmEmailRequest(
    email: string,
    password: string,
  ): Promise<void> {
    const url = `${process.env.UI_BASE_URL}/login`;

    const result = await this.mailService.send({
      to: email,
      subject: `[Origin] Welcome TO D-REC`,
      html: `Welcome to the marketplace!You are added in Drec platform, Please click the link below to login: <br/> <br/>
      <p>UserName:<b>${email}</b></p> 
      <p> PassWord:<b>${password}</b></p>
      <p><a href="${url}"style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 5px;">click me</a>.</p>`,
    });

    if (result) {
      this.logger.log(`Notification email sent to ${email}.`);
    }
  }

  private async sendResetPasswordRequest(
    email: string,
    token: string,
    role?: string
  ): Promise<void> {
    const url = `${process.env.UI_BASE_URL}/reset-password?token=${token}&email=${email}&role=${role}`;

    const result = await this.mailService.send({
      to: email,
      subject: `[Origin] Reset your Password`,
      html: `Welcome to the marketplace! Please used token below to reset your Password: <br/> <h4>Token:${token}</h4> <br/><a href="${url}">${url}</a>.`,
    });

    if (result) {
      this.logger.log(`Notification email sent to ${email}.`);
    }
  }


  async remove(userId: number): Promise<void> {

    const allemialconfirm = await this.get(userId)
    console.log('allemialconfirl', allemialconfirm.id)
    await this.repository.delete(allemialconfirm.id);
  }


  // private async sendInvitation(
  //   organization: string,
  //   email: string,
  //   token: string,
  // ): Promise<void> {
  //   const url = `${process.env.UI_BASE_URL}`;

  //   const result = await this.mailService.send({
  //     to: email,
  //     subject: `[Origin] Organization invitation`,
  //     html: `Organization <b>${organization}</b> has invited you to join. To accept the invitation,<br> 
  //    <b> Please click the button to confirm your email: </b> <a href="${url}/confirm-email?token=${token}">Confirme</a>.<br>
  //     <b> and Please change password: </b> <a href="${url}/reset-password?token=${token}&email=${email}">Add Password</a><br>
  //    and then login and visit`,
  //   });

  //   if (result) {
  //     this.logger.log(`Notification email sent to ${email}.`);
  //   }
  // }

  public async sendInvitation(
    inviteuser: any,
    email: string,

    invitationId: number
  ): Promise<void> {
    const url = `${process.env.UI_BASE_URL}/login`;

    // const htmlTemplate = `
    //   <p>Organization <b>${organization}</b> has invited you to join.</p>
    //   <p>To accept the invitation, please change your password using the following link :</p>
    //   <p><a href="${url}/reset-password?token=${token}&email=${email}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 5px;">Add Password</a></p>
    //   <p>After changing your password, you can log in and visit the your invitation details in website.</p>
    // `;
    const htmlTemplate = `
    <p> Dear ${email},<p>
    <p> you have been invited to register with D-REC from Organization <b>${inviteuser.orgName}</b></p>
    <p>Use your email and the password below to login into D-REC Initiative.<p>
    <p>
    Username: <b>${email}</b><br>
    Password: <b>${inviteuser.password}<b><p>
    <p><a href="${url}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 5px;">Click me</a></p>
   <hr>
    <p>Thank you<br>
    Best Regards
    <br>
    DREC initiative</p>
  `;

    const result = await this.mailService.send({
      to: email,
      subject: `[Origin] Organization Invitation`,
      html: htmlTemplate,
    });

    if (result) {
      this.logger.log(`Notification email sent to ${email}.`);
    }
  }
}
