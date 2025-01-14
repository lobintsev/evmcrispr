import type { Signer } from 'ethers';

import type { BindingsManager } from '../../BindingsManager';

import { Module } from '../../Module';
import type { IPFSResolver } from '../../IPFSResolver';
import { commands } from './commands';
import { helpers } from './helpers';

export class Std extends Module {
  #modules: Module[];

  constructor(
    bindingsManager: BindingsManager,
    nonces: Record<string, number>,
    signer: Signer,
    ipfsResolver: IPFSResolver,
    modules: Module[],
  ) {
    super(
      'std',
      bindingsManager,
      nonces,
      commands,
      helpers,
      signer,
      ipfsResolver,
    );

    this.#modules = modules;
  }

  get modules(): Module[] {
    return this.#modules;
  }
}
