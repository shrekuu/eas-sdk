import { ZERO_ADDRESS } from '../utils';
import { TypedDataSigner } from '@ethersproject/abstract-signer';
import { BigNumberish, utils } from 'ethers';

const { getAddress, verifyTypedData, hexlify, joinSignature, splitSignature, keccak256, toUtf8Bytes, defaultAbiCoder } =
  utils;

export interface PartialTypedDataConfig {
  address: string;
  version: string;
  chainId: number;
}

export interface TypedDataConfig extends PartialTypedDataConfig {
  name: string;
}

export interface DomainTypedData {
  chainId: number;
  name: string;
  verifyingContract: string;
  version: string;
}

export interface TypedDataParams {
  types: string[];
  values: unknown[];
}

export interface TypedData {
  name: string;
  type:
    | 'bool'
    | 'uint8'
    | 'uint16'
    | 'uint32'
    | 'uint64'
    | 'uint128'
    | 'uint256'
    | 'address'
    | 'string'
    | 'bytes'
    | 'bytes32';
}

export interface EIP712DomainTypedData {
  chainId: number;
  name: string;
  verifyingContract: string;
  version: string;
}

export interface EIP712MessageTypes {
  [additionalProperties: string]: TypedData[];
}

export type EIP712Params = {
  nonce?: BigNumberish;
};

export interface EIP712TypedData<T extends EIP712MessageTypes, P extends EIP712Params> {
  domain: EIP712DomainTypedData;
  primaryType: keyof T;
  types: T;
  message: P;
}

export interface Signature {
  r: string;
  s: string;
  v: number;
}

export type EIP712Request<T extends EIP712MessageTypes, P extends EIP712Params> = EIP712TypedData<T, P>;

export type EIP712Response<T extends EIP712MessageTypes, P extends EIP712Params> = EIP712TypedData<T, P> & {
  signature: Signature;
};

export const EIP712_DOMAIN = 'EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)';

export abstract class TypedDataHandler {
  protected config: TypedDataConfig;

  public constructor(config: TypedDataConfig) {
    this.config = config;
  }

  public getDomainSeparator() {
    return keccak256(
      defaultAbiCoder.encode(
        ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
        [
          keccak256(toUtf8Bytes(EIP712_DOMAIN)),
          keccak256(toUtf8Bytes(this.config.name)),
          keccak256(toUtf8Bytes(this.config.version)),
          this.config.chainId,
          this.config.address
        ]
      )
    );
  }

  public getDomainTypedData(): DomainTypedData {
    return {
      name: this.config.name,
      version: this.config.version,
      chainId: this.config.chainId,
      verifyingContract: this.config.address
    };
  }

  public async signTypedDataRequest<T extends EIP712MessageTypes, P extends EIP712Params>(
    params: P,
    types: EIP712TypedData<T, P>,
    signer: TypedDataSigner
  ): Promise<EIP712Response<T, P>> {
    const rawSignature = await signer._signTypedData(types.domain, types.types, params);
    const signature = splitSignature(rawSignature);

    return { ...types, signature: { v: signature.v, r: signature.r, s: signature.s } };
  }

  public verifyTypedDataRequestSignature<T extends EIP712MessageTypes, P extends EIP712Params>(
    attester: string,
    request: EIP712Response<T, P>
  ): boolean {
    if (attester === ZERO_ADDRESS) {
      throw new Error('Invalid address');
    }

    const { signature } = request;
    const sig = joinSignature({ v: signature.v, r: hexlify(signature.r), s: hexlify(signature.s) });
    const recoveredAddress = verifyTypedData(request.domain, request.types, request.message, sig);

    return getAddress(attester) === getAddress(recoveredAddress);
  }
}
