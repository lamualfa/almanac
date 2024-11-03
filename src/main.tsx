import React from 'react'
import ReactDOM from 'react-dom/client'
import {
	RouterProvider,
	createMemoryHistory,
	createRouter,
} from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createTheme, MantineProvider } from '@mantine/core'

const routerHistory = createMemoryHistory()

const router = createRouter({
	routeTree,
	history: routerHistory,
	defaultPreload: 'intent',
})

// Register things for typesafety
declare module '@tanstack/react-router' {
	interface Register {
		router: typeof router
	}
}

const queryClient = new QueryClient()
const mantineTheme = createTheme({})

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
	<React.StrictMode>
		<QueryClientProvider client={queryClient}>
			<MantineProvider theme={mantineTheme}>
				<RouterProvider router={router} />
			</MantineProvider>
		</QueryClientProvider>
	</React.StrictMode>,
)
