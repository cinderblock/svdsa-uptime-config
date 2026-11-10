/**
 * Worker entry point.
 *
 * uptime-tracker is vendored under `vendor/` as a git submodule and is never
 * modified — nothing is copied into it, nothing is generated inside it. All
 * deployment-specific state (config, resource IDs, secrets) lives in this repo.
 */
import { createWorker } from '../vendor/uptime-tracker/src/index';
import { config, ddnsClients } from './config';

export default createWorker({ config, ddnsClients });
