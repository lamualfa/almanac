import type { FileDetail, FileInfo, FsInfo } from '@/bindings'
import { FileTypeColors, FileTypeIcon, FsType } from '@/const'
import {
	useThumbnailSrcQuery,
	useFsDetailQuery,
	useOpenPathMutation,
} from '@/hooks'
import {
	Anchor,
	Badge,
	Group,
	LoadingOverlay,
	Skeleton,
	Text,
} from '@mantine/core'
import { type Icon, IconFile, IconFolder } from '@tabler/icons-react'
import { useNavigate } from '@tanstack/react-router'
import prettyBytes from 'pretty-bytes'
import { Fragment, useState, type ReactNode } from 'react'

export interface FsCardProps {
	priority: number
	info: FsInfo
}
export function FsCard(props: FsCardProps) {
	const openFsMutation = useOpenPathMutation()
	const navigate = useNavigate()

	const onClick = () => {
		if (props.info.type === FsType.File) {
			openFsMutation.mutate({
				path: props.info.path,
			})
		} else {
			navigate({
				to: '/',
				search: {
					path: props.info.path,
				},
			})
		}
	}

	return (
		<div className="w-72 relative">
			<LoadingOverlay
				visible={openFsMutation.isPending}
				overlayProps={{
					blur: 1,
				}}
				loaderProps={{
					children: 'Opening...',
				}}
			/>
			<Preview priority={props.priority} info={props.info} />
			<Details priority={props.priority} info={props.info} />
			<Anchor
				title={props.info.name}
				size="sm"
				c="black"
				className="w-full break-all text-ellipsis block"
				onClick={onClick}
			>
				{props.info.name}
			</Anchor>
		</div>
	)
}

interface DetailsProps {
	priority: number
	info: FsInfo
}
function Details(props: DetailsProps) {
	const detailQuery = useFsDetailQuery({
		priority: props.priority,
		path: props.info.path,
		queryOptions: {
			isEnabled: props.info.type === FsType.File,
		},
	})

	let children: ReactNode

	if (detailQuery.isLoading) {
		children = <Skeleton height={16} width={45} />
	}

	if (props.info.type === FsType.File) {
		children = (
			<Fragment>
				<Text size="xs" c="gray">
					{props.info.totalViews
						? `${props.info.totalViews} views`
						: 'Never viewed'}
				</Text>
				{props.info.size === null ? (
					<Badge size="xs" color="red">
						Can't get size
					</Badge>
				) : (
					<Text size="xs" c="gray">
						{prettyBytes(props.info.size)}
					</Text>
				)}
			</Fragment>
		)
	}

	if (detailQuery.data?.type === FsType.Folder) {
		children = (
			<Fragment>
				{detailQuery.data.totalItems === null ? (
					<Badge size="xs" color="red">
						Can't count items
					</Badge>
				) : (
					<Text size="xs" c="gray">
						{detailQuery.data.totalItems} items
					</Text>
				)}
			</Fragment>
		)
	}

	return (
		<Group
			my="xs"
			align="center"
			justify={props.info.type === FsType.File ? 'space-between' : 'end'}
			className="h-6"
		>
			{children}
		</Group>
	)
}

interface PreviewProps {
	priority: number
	info: FsInfo
}
function Preview(props: PreviewProps) {
	const [thumbnailRetries, setThumbnailRetries] = useState(0)
	const detailQuery = useFsDetailQuery({
		priority: props.priority,
		path: props.info.path,
	})
	const thumbnailSrcQuery = useThumbnailSrcQuery({
		priority: props.priority,
		path: props.info.path,
		queryOptions: {
			isEnabled: detailQuery.data?.type === FsType.File,
		},
	})

	let children: ReactNode

	if (thumbnailSrcQuery.data && thumbnailRetries < 3) {
		children = (
			<img
				className="h-full w-full object-contain"
				alt={props.info.name}
				src={`${thumbnailSrcQuery.data}#${thumbnailRetries}`}
				onError={() => {
					thumbnailSrcQuery.refetch()
					setThumbnailRetries((retries) => retries + 1)
				}}
			/>
		)
	}

	if (
		!children &&
		props.info.type === FsType.File &&
		detailQuery.data?.type === FsType.File
	) {
		children = <PreviewFile info={props.info} detail={detailQuery.data} />
	}

	if (
		!children &&
		props.info.type === FsType.Folder &&
		detailQuery.data?.type === FsType.Folder
	) {
		children = <PreviewFolder />
	}

	return (
		<div className="h-32 rounded-md flex items-center justify-center overflow-hidden bg-gray-100">
			{children}
		</div>
	)
}

interface PreviewFileProps {
	info: FileInfo
	detail: FileDetail
}
function PreviewFile(props: PreviewFileProps) {
	let Icon: Icon | undefined
	if (props.detail.mime && props.detail.mime in FileTypeIcon) {
		Icon = FileTypeIcon[props.detail.mime as keyof typeof FileTypeIcon]
	}
	if (!Icon) {
		Icon = IconFile
	}

	let iconColor: string | undefined
	if (props.detail.mime && props.detail.mime in FileTypeColors) {
		iconColor = FileTypeColors[props.detail.mime as keyof typeof FileTypeColors]
	}
	if (!iconColor) {
		iconColor = '#374151'
	}

	return (
		<Icon
			className="w-10 h-10"
			style={{
				color: iconColor,
			}}
		/>
	)
}

function PreviewFolder() {
	return (
		<IconFolder
			className="w-10 h-10"
			style={{
				color: '#374151',
			}}
		/>
	)
}
