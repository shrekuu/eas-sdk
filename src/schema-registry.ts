import { Base } from './base';
import { getSchemaUUID, ZERO_ADDRESS, ZERO_BYTES32 } from './utils';
import {
  SchemaRegistry__factory,
  SchemaRegistry as SchemaRegistryContract
} from '@ethereum-attestation-service/eas-contracts';
import { PayableOverrides } from 'ethers';

export declare type SchemaRecord = {
  uuid: string;
  resolver: string;
  schema: string;
};

export interface RegisterSchemaParams {
  schema: string;
  resolverAddress?: string;
  overrides?: PayableOverrides;
}

export interface GetSchemaParams {
  uuid: string;
}

export class SchemaRegistry extends Base<SchemaRegistryContract> {
  constructor(address: string) {
    super(new SchemaRegistry__factory(), address);
  }

  // Registers a new schema and returns its UUID
  public async register({
    schema,
    resolverAddress = ZERO_ADDRESS,
    overrides = {}
  }: RegisterSchemaParams): Promise<string> {
    await this.contract.register(schema, resolverAddress, overrides);

    return getSchemaUUID(schema, resolverAddress);
  }

  // Returns an existing schema by a schema UUID
  public async getSchema({ uuid }: GetSchemaParams): Promise<SchemaRecord> {
    const schema = await this.contract.getSchema(uuid);
    if (schema.uuid === ZERO_BYTES32) {
      throw new Error('Schema not found');
    }

    return schema;
  }
}
