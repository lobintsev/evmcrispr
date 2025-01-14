import type { Signer } from 'ethers';

import type { Address } from '../../src';

import type { EVMcrispr } from '../../src/EVMcrispr';

import type { AragonOS } from '../../src/modules/aragonos/AragonOS';
import type {
  AST,
  BlockExpressionNode,
  CommandExpressionNode,
} from '../../src/types';
import { NodeType } from '../../src/types';
import { listItems } from '../../src/utils';
import { CommandError } from '../../src/errors';
import { createInterpreter, itChecksNonDefinedIdentifier } from './cas11';
import { expectThrowAsync } from './expects';
import {
  getAragonEnsResolver,
  resolveName,
} from '../../src/modules/aragonos/utils';
import type {
  FullPermission,
  Permission,
} from '../../src/modules/aragonos/types';

export const _aragonEns = async (
  ensName: string,
  module: AragonOS,
): Promise<string | null> => {
  const ensResolver = module.getConfigBinding('ensResolver');

  const name = await resolveName(
    ensName,
    ensResolver || getAragonEnsResolver(await module.signer.getChainId()),
    module.signer,
  );

  return name;
};

export const createAragonScriptInterpreter =
  (signer: Signer, daoAddress: Address) =>
  (commands: string[] = []): EVMcrispr => {
    return createInterpreter(
      `
  load aragonos as ar
  ar:connect ${daoAddress} (
    ${commands.join('\n')}
  )
`,
      signer,
    );
  };

export const findAragonOSCommandNode = (
  ast: AST,
  commandName: string,
  nestingLevel = 0,
  index = 0,
): CommandExpressionNode | undefined => {
  let connectNode = ast.body.find(
    (n) =>
      n.type === NodeType.CommandExpression &&
      (n as CommandExpressionNode).name === 'connect',
  ) as CommandExpressionNode;

  if (nestingLevel) {
    let i = 0;
    while (i < nestingLevel) {
      const blockNode = connectNode.args.find(
        (arg) => arg.type === NodeType.BlockExpression,
      ) as BlockExpressionNode;

      connectNode = blockNode.body.find((c) => c.name === 'connect')!;
      i++;
    }
  }

  if (commandName === 'connect') {
    return connectNode;
  }

  const blockNode = connectNode.args.find(
    (n) => n.type === NodeType.BlockExpression,
  ) as BlockExpressionNode;
  const commandNodes = blockNode.body.filter((c) => c.name === commandName);

  return commandNodes[index];
};

export const itChecksBadPermission = (
  commandName: string,
  createPermissionActionInterpreter: (
    badPermission: FullPermission,
  ) => EVMcrispr,
  checkPermissionManager = false,
): void => {
  const permissionErrorText = 'invalid permission provided';
  const permission: Permission = ['kernel', 'acl', 'CREATE_PERMISSIONS_ROLE'];

  itChecksNonDefinedIdentifier(
    'should fail when receiving a non-defined grantee identifier',
    (nonDefinedIdentifier) =>
      createPermissionActionInterpreter([
        nonDefinedIdentifier,
        permission[1],
        permission[2],
      ]),
    commandName,
    0,
    true,
  );

  itChecksNonDefinedIdentifier(
    'should fail when receiving a non-defined app identifier',
    (nonDefinedIdentifier) =>
      createPermissionActionInterpreter([
        permission[0],
        nonDefinedIdentifier,
        permission[2],
      ]),
    commandName,
    1,
    true,
  );

  it('should fail when receiving an invalid grantee address', async () => {
    const invalidGrantee = 'false';
    const interpreter = createPermissionActionInterpreter([
      invalidGrantee,
      permission[1],
      permission[2],
    ]);
    const c = findAragonOSCommandNode(interpreter.ast, commandName);
    const error = new CommandError(
      c!,
      listItems(permissionErrorText, [
        `Invalid grantee. Expected an address, but got ${invalidGrantee}`,
      ]),
    );

    await expectThrowAsync(() => interpreter.interpret(), error);
  });

  it('should fail when receiving an invalid app address', async () => {
    const invalidApp = 'false';
    const interpreter = createPermissionActionInterpreter([
      permission[0],
      invalidApp,
      permission[2],
    ]);
    const c = findAragonOSCommandNode(interpreter.ast, commandName);
    const error = new CommandError(
      c!,
      listItems(permissionErrorText, [
        `Invalid app. Expected an address, but got ${invalidApp}`,
      ]),
    );

    await expectThrowAsync(() => interpreter.interpret(), error);
  });

  it('should fail when receiving a non-existent role', async () => {
    const nonExistentRole = 'NON_EXISTENT_ROLE';
    const interpreter = createPermissionActionInterpreter([
      permission[0],
      permission[1],
      nonExistentRole,
    ]);
    const c = findAragonOSCommandNode(interpreter.ast, commandName);
    const error = new CommandError(
      c!,
      `given permission doesn't exists on app ${permission[1]}`,
    );

    await expectThrowAsync(() => interpreter.interpret(), error);
  });

  it('should fail when receiving an invalid hash role', async () => {
    const invalidHashRole =
      '0x154c00819833dac601ee5ddded6fda79d9d8b506b911b3dbd54cdb95fe6c366';
    const interpreter = createPermissionActionInterpreter([
      permission[0],
      permission[1],
      invalidHashRole,
    ]);
    const c = findAragonOSCommandNode(interpreter.ast, commandName)!;
    const error = new CommandError(
      c,
      listItems(permissionErrorText, [
        `Invalid role. Expected a valid hash, but got ${invalidHashRole}`,
      ]),
    );

    await expectThrowAsync(() => interpreter.interpret(), error);
  });

  if (checkPermissionManager) {
    it('should fail when not receiving permission manager', async () => {
      const interpreter = createPermissionActionInterpreter([
        permission[0],
        permission[1],
        permission[2],
      ]);
      const c = findAragonOSCommandNode(interpreter.ast, commandName)!;
      const error = new CommandError(c, 'required permission manager missing');

      await expectThrowAsync(() => interpreter.interpret(), error);
    });

    itChecksNonDefinedIdentifier(
      'should fail when receiving a non-existent permission manager identifier',
      (nonDefinedIdentifier) =>
        createPermissionActionInterpreter([
          ...permission,
          nonDefinedIdentifier,
        ]),
      commandName,
      3,
      true,
    );

    it('should fail when receiving an invalid permission manager address', async () => {
      const invalidManager = 'false';
      const interpreter = createPermissionActionInterpreter([
        ...permission,
        invalidManager,
      ]);
      const c = findAragonOSCommandNode(interpreter.ast, commandName)!;
      const error = new CommandError(
        c,
        `invalid permission manager. Expected an address, but got ${invalidManager}`,
      );

      await expectThrowAsync(() => interpreter.interpret(), error);
    });
  }
};
