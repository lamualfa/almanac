import { usePathAsPathvecQuery, usePathvecAsPathQuery } from "@/hooks";
import { Anchor, Breadcrumbs, Card, Text } from "@mantine/core";
import { useNavigate } from "@tanstack/react-router";

export interface PathBreadcrumbProps {
  path: string;
}

export function PathBreadcrumb(props: PathBreadcrumbProps) {
  const pathAsPathvecQuery = usePathAsPathvecQuery({
    path: props.path,
  });
  if (!pathAsPathvecQuery.data) {
    return <p>Loading...</p>;
  }

  return (
    <Card withBorder shadow="md" className="w-max" radius="md" padding="sm">
      <Breadcrumbs>
        {pathAsPathvecQuery.data.map((name, i) => (
          <PathAnchor
            key={`${i}.${name}`}
            index={i}
            pathvec={pathAsPathvecQuery.data}
          />
        ))}
      </Breadcrumbs>
    </Card>
  );
}

interface PathAnchorProps {
  index: number;
  pathvec: string[];
}
function PathAnchor(props: PathAnchorProps) {
  const isFirst = props.index === 0;
  const name = props.pathvec[props.index];
  const isRoot = isFirst && name === "/";
  const isLast = props.index === props.pathvec.length - 1;
  const text = isRoot ? "Root" : name;
  const pathvec = props.pathvec.slice(0, props.index + 1);
  const pathvecAsPathQuery = usePathvecAsPathQuery({
    pathvec,
    queryOptions: {
      isEnabled: !isLast,
    },
  });
  const navigate = useNavigate();
  const onClick = () => {
    navigate({
      to: "/",
      search: {
        path: pathvecAsPathQuery.data,
      },
    });
  };

  if (pathvecAsPathQuery.isLoading) {
    return <Text size="sm">Loading...</Text>;
  }

  if (isLast) {
    return <Text size="sm">{text}</Text>;
  }

  return (
    <Anchor size="sm" onClick={onClick}>
      {text}
    </Anchor>
  );
}
