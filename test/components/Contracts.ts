import { ETHResolver__factory } from '../typechain-types';
import {
  EAS__factory,
  EIP712Proxy__factory,
  SchemaRegistry__factory
} from '@ethereum-attestation-service/eas-contracts';
import { ContractFactory, Signer } from 'ethers';
import { ethers } from 'hardhat';

export * from '../typechain-types';

/* eslint-disable @typescript-eslint/no-explicit-any */
type AsyncReturnType<T extends (...args: never) => any> = T extends (...args: any) => Promise<infer U>
  ? U
  : T extends (...args: any) => infer U
  ? U
  : any;
/* eslint-enable @typescript-eslint/no-explicit-any */

type Contract<F extends ContractFactory> = AsyncReturnType<F['deploy']>;

export interface ContractBuilder<F extends ContractFactory> {
  metadata: {
    contractName: string;
    bytecode: string;
  };
  deploy(...args: Parameters<F['deploy']>): Promise<Contract<F>>;
  attach(address: string, passedSigner?: Signer): Promise<Contract<F>>;
}

export type FactoryConstructor<F extends ContractFactory> = {
  new (signer?: Signer): F;
  abi: unknown;
  bytecode: string;
};

export const deployOrAttach = <F extends ContractFactory>(
  contractName: string,
  FactoryConstructor: FactoryConstructor<F>,
  initialSigner?: Signer
): ContractBuilder<F> => {
  return {
    metadata: {
      contractName,
      bytecode: FactoryConstructor.bytecode
    },
    deploy: async (...args: Parameters<F['deploy']>): Promise<Contract<F>> => {
      const defaultSigner = initialSigner ?? (await ethers.getSigners())[0];

      return new FactoryConstructor(defaultSigner).deploy(...(args || [])) as Promise<Contract<F>>;
    },
    attach: attachOnly<F>(FactoryConstructor, initialSigner).attach
  };
};

export const attachOnly = <F extends ContractFactory>(
  FactoryConstructor: FactoryConstructor<F>,
  initialSigner?: Signer
) => {
  return {
    attach: async (address: string, signer?: Signer): Promise<Contract<F>> => {
      const defaultSigner = initialSigner ?? (await ethers.getSigners())[0];
      return new FactoryConstructor(signer ?? defaultSigner).attach(address) as Contract<F>;
    }
  };
};

/* eslint-disable camelcase */
const getContracts = (signer?: Signer) => ({
  connect: (signer: Signer) => getContracts(signer),

  EAS: deployOrAttach('EAS', EAS__factory, signer),
  SchemaRegistry: deployOrAttach('SchemaRegistry', SchemaRegistry__factory, signer),
  EIP712Proxy: deployOrAttach('EIP712Proxy', EIP712Proxy__factory, signer),

  ETHResolver: deployOrAttach('ETHResolver', ETHResolver__factory, signer)
});
/* eslint-enable camelcase */

export default getContracts();
