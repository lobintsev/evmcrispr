import type { Signer } from 'ethers';

import type { BindingsManager } from '../../BindingsManager';
import { ErrorNotFound } from '../../errors';
import type { IPFSResolver } from '../../IPFSResolver';
import { BindingsSpace } from '../../types';
import type { Address } from '../../types';
import {
  addressesEqual,
  buildNonceForAddress,
  calculateNewProxyAddress,
} from '../../utils';
import { Module } from '../../Module';
import type { AragonDAO } from './AragonDAO';
import { commands } from './commands';
import { helpers } from './helpers';

export class AragonOS extends Module {
  #connectedDAOs: AragonDAO[];

  constructor(
    bindingsManager: BindingsManager,
    nonces: Record<string, number>,
    signer: Signer,
    ipfsResolver: IPFSResolver,
    alias?: string,
  ) {
    super(
      'aragonos',
      bindingsManager,
      nonces,
      commands,
      helpers,
      signer,
      ipfsResolver,
      alias,
    );

    this.#connectedDAOs = [];
  }

  get connectedDAOs(): AragonDAO[] {
    return this.#connectedDAOs;
  }

  get currentDAO(): AragonDAO | undefined {
    return this.bindingsManager.getBindingValue(
      'currentDAO',
      BindingsSpace.DATA_PROVIDER,
    ) as AragonDAO | undefined;
  }

  set currentDAO(dao: AragonDAO | undefined) {
    if (!dao) {
      return;
    }

    this.bindingsManager.setBinding(
      'currentDAO',
      dao,
      BindingsSpace.DATA_PROVIDER,
    );
  }

  getConnectedDAO(daoAddress: Address): AragonDAO | undefined {
    return this.connectedDAOs.find((dao) =>
      addressesEqual(dao.kernel.address, daoAddress),
    );
  }

  async registerNextProxyAddress(
    identifier: string,
    daoAddress: Address,
  ): Promise<string> {
    const connectedDAO = this.getConnectedDAO(daoAddress);

    if (!connectedDAO) {
      throw new ErrorNotFound(`couldn't found DAO ${daoAddress}`);
    }

    const kernel = connectedDAO.resolveApp('kernel')!;
    const nonce = await buildNonceForAddress(
      kernel.address,
      this.incrementNonce(kernel.address),
      this.signer.provider!,
    );

    const addr = calculateNewProxyAddress(kernel.address, nonce);
    this.bindingsManager.setBinding(identifier, addr, BindingsSpace.ADDR);
    return addr;
  }
}
