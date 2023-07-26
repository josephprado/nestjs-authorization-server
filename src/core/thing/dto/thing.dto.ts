import { PickType } from '@nestjs/mapped-types';
import { Thing } from '../entity/thing.entity';

/**
 * Represents a thing owned by a user
 */
export class ThingDto extends PickType(Thing, [
  'id',
  'name',
  'description'
] as const) {}
