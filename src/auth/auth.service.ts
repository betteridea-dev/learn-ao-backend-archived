import { Injectable } from '@nestjs/common';
import { User, UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { base64ToUint8Array } from 'src/lib/utils';

class VerifyDTO {
  publicKey: string;
  signature: string;
  data: string;
  walletAddress: string;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateSignature({
    data,
    publicKey,
    signature,
    walletAddress,
  }: VerifyDTO): Promise<boolean> {
    const publicJWK = {
      e: 'AQAB',
      ext: true,
      kty: 'RSA',
      n: publicKey,
    };

    const hash = await crypto.subtle.digest(
      'SHA-256',
      base64ToUint8Array(data),
    );

    // import public jwk for verification
    const verificationKey = await crypto.subtle.importKey(
      'jwk',
      publicJWK,
      {
        name: 'RSA-PSS',
        hash: 'SHA-256',
      },
      false,
      ['verify'],
    );

    // verify the signature by matching it with the hash
    const isValidSignature = await crypto.subtle.verify(
      { name: 'RSA-PSS', saltLength: 32 },
      verificationKey,
      base64ToUint8Array(signature),
      hash,
    );

    const decoded = new TextDecoder().decode(base64ToUint8Array(data));
    // console.log(decoded);

    return isValidSignature && decoded === walletAddress;
  }

  async getOrCreateUser(walletAddress: string): Promise<User> {
    const user = await this.usersService.findByAddress(walletAddress);

    if (user) {
      return user;
    }

    return this.usersService.create({ address: walletAddress });
  }

  async login(user: User) {
    const payload = { ...user };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
