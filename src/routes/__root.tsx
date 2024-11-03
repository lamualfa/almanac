import './__root.css'
import '@mantine/core/styles.css'

import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { Outlet, createRootRoute } from '@tanstack/react-router'
import { Fragment } from 'react/jsx-runtime'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <Fragment>
      <Outlet />
      <TanStackRouterDevtools initialIsOpen={false} />
      <ReactQueryDevtools initialIsOpen={false} />
    </Fragment>
  )
}
