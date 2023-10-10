import { Strategy as PassportStrategy } from 'passport-strategy';
import { Injectable, UnauthorizedException } from '@nestjs/common';


export class ClientPasswordStrategy extends PassportStrategy {
  // name:string='';
  // _verify:any=null;
  // _passReqToCallback:any=null;
  constructor(options: any, verify: any) {
    if (typeof options === 'function') {
      verify = options;
      options = {};
    }
    if (!verify) throw new Error('OAuth 2.0 client password strategy requires a verify function');

    super();
    //@ts-ignore
    this.name = 'oauth2-client-password';
     //@ts-ignore
    this._verify = verify;
     //@ts-ignore
    this._passReqToCallback = options.passReqToCallback;
  }

  authenticate(req: any) {
    if (!req.headers || (!req.headers['client_id'] || !req.headers['client_secret'])) {
     // throw new UnauthorizedException({statusCode: 401, message:"client_id or client_secret missing from headers"});
       //@ts-ignore
      return this.fail();
      
    }

    const clientId = req.headers['client_id'];
    const clientSecret = req.headers['client_secret'];

    const self = this;

    function verified(err: Error | null, client?: any, info?: any) {
      if (err) {
         //@ts-ignore
        return self.error(err);
      }
      if (!client) {
        throw new UnauthorizedException({statusCode: 401, message:"client is missing"});
         //@ts-ignore
        return self.fail();
      }
       //@ts-ignore
      self.success(client, info);
    }
 //@ts-ignore
    if (self._passReqToCallback) {
       //@ts-ignore
      this._verify(req, clientId, clientSecret, verified);
    } else {
       //@ts-ignore
      this._verify(clientId, clientSecret, verified);
    }
  }
}