import { createFileRoute } from "@tanstack/react-router";
import { valibotSearchValidator } from "@tanstack/router-valibot-adapter";
import * as v from "valibot";
import { useFsInfoQuery, useFsChildrenInfosQuery } from "@/hooks";
import { FsType } from "@/const";
import { Fragment } from "react/jsx-runtime";
import { Alert, LoadingOverlay } from "@mantine/core";
import { PathBreadcrumb } from "@/components/path-breadcrumb";
import { FsCard } from "@/components/fs-card";
import { IconExclamationCircle, IconMoodEmpty } from "@tabler/icons-react";
import { forwardRef, type HTMLProps } from "react";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeGrid } from "react-window";

const searchSchema = v.object({
  path: v.optional(v.string(), "/"),
});

export const Route = createFileRoute("/")({
  validateSearch: valibotSearchValidator(searchSchema),
  component: Home,
});

const GUTTER_SIZE = 24;
const COLUMN_WIDTH = 288;
const ROW_HEIGHT = 225;

const GridInner = forwardRef<HTMLDivElement, HTMLProps<HTMLDivElement>>(
  ({ style, children, ...restProps }, ref) => (
    <div
      ref={ref}
      style={{
        ...style,
        paddingLeft: GUTTER_SIZE,
        paddingTop: GUTTER_SIZE,
      }}
      {...restProps}
    />
  ),
);

function Home() {
  const { path } = Route.useSearch();
  const fsInfoQuery = useFsInfoQuery({
    path,
  });
  const fsChildrenInfoQuery = useFsChildrenInfosQuery({
    path,
    queryOptions: {
      isEnabled: fsInfoQuery.data?.type === FsType.Folder,
    },
  });

  const error = fsInfoQuery.error || fsChildrenInfoQuery.error;

  return (
    <Fragment>
      <header className="py-4 px-6 fixed top-0 w-full z-[500] bg-transparent">
        <PathBreadcrumb path={path} />
      </header>

      <LoadingOverlay
        visible={fsInfoQuery.isLoading || fsChildrenInfoQuery.isLoading}
        loaderProps={{
          children: "Loading...",
        }}
      />
      <main className="w-screen h-screen">
        {error && (
          <Alert
            variant="light"
            color="red"
            title="Error"
            icon={<IconExclamationCircle />}
          >
            {error.toString()}
          </Alert>
        )}
        {fsChildrenInfoQuery.data?.length === 0 && (
          <Alert variant="light" title="Info" icon={<IconMoodEmpty />}>
            Empty folder
          </Alert>
        )}
        {fsChildrenInfoQuery.data && (
          <AutoSizer>
            {({ width, height }) => {
              const totalData = fsChildrenInfoQuery.data.length;
              const columnWidth = COLUMN_WIDTH + GUTTER_SIZE;
              const columnCount = Math.floor(
                (width - GUTTER_SIZE) / columnWidth,
              );
              const rowHeight = ROW_HEIGHT + GUTTER_SIZE;
              const rowCount = Math.ceil(totalData / columnCount);

              return (
                <FixedSizeGrid
                  width={width}
                  height={height}
                  columnWidth={columnWidth}
                  columnCount={columnCount}
                  rowHeight={rowHeight}
                  rowCount={rowCount}
                  innerElementType={GridInner}
                >
                  {({ columnIndex, rowIndex, style }) => {
                    const resolvedIndex = rowIndex * columnCount + columnIndex;

                    if (!fsChildrenInfoQuery.data[resolvedIndex]) {
                      return null;
                    }

                    return (
                      <div
                        className="overflow-hidden"
                        style={{
                          ...style,
                          left: (style.left as number) + GUTTER_SIZE,
                          top: (style.top as number) + GUTTER_SIZE + 75,
                          width: (style.width as number) - GUTTER_SIZE,
                          height: (style.height as number) - GUTTER_SIZE,
                        }}
                      >
                        <FsCard
                          priority={0}
                          info={fsChildrenInfoQuery.data[resolvedIndex]}
                        />
                      </div>
                    );
                  }}
                </FixedSizeGrid>
              );
            }}
          </AutoSizer>
        )}
      </main>
    </Fragment>
  );
}
