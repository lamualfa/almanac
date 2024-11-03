import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { commands } from '@/bindings'
import {
	getFsInfosQueryKey,
	type GetFsInfosQueryKeyOptions,
	resolveCommandResult,
} from '@/libs'
import { convertFileSrc } from '@tauri-apps/api/core'
import { promise as createQueue } from 'fastq'

export interface UsePathAsPathvecQueryOptions {
	path: string
}
export function usePathAsPathvecQuery(options: UsePathAsPathvecQueryOptions) {
	return useQuery({
		queryKey: [commands.convertPathToPathvec.name, options.path] as const,
		async queryFn({ queryKey }) {
			return await commands.convertPathToPathvec(queryKey[1])
		},
	})
}

export interface UsePathvecAsPathQueryOptions {
	pathvec: string[]
	queryOptions?: {
		isEnabled?: boolean
	}
}
export function usePathvecAsPathQuery(options: UsePathvecAsPathQueryOptions) {
	return useQuery({
		enabled: options.queryOptions?.isEnabled,
		queryKey: [commands.convertPathvecToPath.name, options.pathvec] as const,
		async queryFn({ queryKey }) {
			return await commands.convertPathvecToPath(queryKey[1])
		},
	})
}

export interface UseFsInfoQueryOptions {
	path: string
}
export function useFsInfoQuery(options: UseFsInfoQueryOptions) {
	return useQuery({
		queryKey: [commands.getFsInfo.name, options.path] as const,
		async queryFn({ queryKey }) {
			return await resolveCommandResult(commands.getFsInfo(queryKey[1]))
		},
	})
}

export interface UseFsDetailQueryOptions {
	priority: number
	path: string
	queryOptions?: {
		isEnabled?: boolean
	}
}
export function useFsDetailQuery(options: UseFsDetailQueryOptions) {
	return useQuery({
		enabled: options.queryOptions?.isEnabled,
		queryKey: [commands.getFsDetail.name, options.path] as const,
		async queryFn({ queryKey }) {
			return await resolveCommandResult(commands.getFsDetail(queryKey[1]))
		},
	})
}

export interface UseFsChildrenInfosQueryOptions
	extends GetFsInfosQueryKeyOptions {
	queryOptions?: {
		isEnabled?: boolean
	}
}
export function useFsChildrenInfosQuery(
	options: UseFsChildrenInfosQueryOptions,
) {
	return useQuery({
		enabled: options.queryOptions?.isEnabled,
		queryKey: getFsInfosQueryKey(options),
		async queryFn({ queryKey }) {
			return await resolveCommandResult(
				commands.getFsChildrenInfos(queryKey[1]),
			)
		},
	})
}

export interface UseOpenPathMutationInput {
	path: string
}
export function useOpenPathMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationKey: [commands.openPath.name],
		async mutationFn(input: UseOpenPathMutationInput) {
			return await resolveCommandResult(commands.openPath(input.path))
		},
		async onSuccess(_, input) {
			const pathvec = await commands.convertPathToPathvec(input.path)
			const parentPathvec = pathvec.slice(0, -1)
			const parentPath = await commands.convertPathvecToPath(parentPathvec)

			await queryClient.invalidateQueries({
				queryKey: getFsInfosQueryKey({
					path: parentPath,
				}),
			})
		},
	})
}

const thumbnailSrcQueue = createQueue(async (path: string) => {
	const thumbnailPath = await resolveCommandResult(
		commands.getThumbnailPath(path),
	)

	return convertFileSrc(thumbnailPath)
}, 1)

export interface UseThumbnailSrcQueryOptions {
	path: string
	priority: number
	queryOptions?: {
		isEnabled?: boolean
	}
}
export function useThumbnailSrcQuery(options: UseThumbnailSrcQueryOptions) {
	return useQuery({
		enabled: options.queryOptions?.isEnabled,
		refetchOnWindowFocus: true,
		refetchOnMount: true,
		queryKey: [commands.getThumbnailPath.name, options.path] as const,
		async queryFn({ queryKey }) {
			return await thumbnailSrcQueue.push(queryKey[1])
		},
	})
}
