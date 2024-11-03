import { commands, type Result } from "./bindings";

export async function resolveCommandResult<R, E>(
  promiseResult: Promise<Result<R, E>>,
) {
  const result = await promiseResult;

  switch (result.status) {
    case "ok":
      return result.data;
    case "error":
      throw result.error;
  }
}

export interface GetFsInfosQueryKeyOptions {
  path: string;
}
export function getFsInfosQueryKey(options: GetFsInfosQueryKeyOptions) {
  return [commands.getFsChildrenInfos.name, options.path] as const;
}
