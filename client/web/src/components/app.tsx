// Copyright (c) Tailscale Inc & AUTHORS
// SPDX-License-Identifier: BSD-3-Clause

import React, { useEffect } from "react"
import { ReactComponent as TailscaleIcon } from "src/assets/icons/tailscale-icon.svg"
import LoginToggle from "src/components/login-toggle"
import DeviceDetailsView from "src/components/views/device-details-view"
import HomeView from "src/components/views/home-view"
import LoginView from "src/components/views/login-view"
import SSHView from "src/components/views/ssh-view"
import SubnetRouterView from "src/components/views/subnet-router-view"
import { UpdatingView } from "src/components/views/updating-view"
import useAuth, { AuthResponse } from "src/hooks/auth"
import useNodeData, {
  Feature,
  featureDescription,
  NodeData,
} from "src/hooks/node-data"
import LoadingDots from "src/ui/loading-dots"
import { Link, Route, Router, Switch, useLocation } from "wouter"

export default function App() {
  const { data: auth, loading: loadingAuth, newSession } = useAuth()

  return (
    <main className="min-w-sm max-w-lg mx-auto py-4 sm:py-14 px-5">
      {loadingAuth || !auth ? (
        <LoadingView />
      ) : (
        <WebClient auth={auth} newSession={newSession} />
      )}
    </main>
  )
}

function WebClient({
  auth,
  newSession,
}: {
  auth: AuthResponse
  newSession: () => Promise<void>
}) {
  const { data, refreshData, nodeUpdaters } = useNodeData()
  useEffect(() => {
    refreshData()
  }, [auth, refreshData])

  return !data ? (
    <LoadingView />
  ) : data.Status === "NeedsLogin" ||
    data.Status === "NoState" ||
    data.Status === "Stopped" ? (
    // Client not on a tailnet, render login.
    <LoginView data={data} refreshData={refreshData} />
  ) : (
    // Otherwise render the new web client.
    <>
      <Router base={data.URLPrefix}>
        <Header node={data} auth={auth} newSession={newSession} />
        <Switch>
          <Route path="/">
            <HomeView
              readonly={!auth.canManageNode}
              node={data}
              nodeUpdaters={nodeUpdaters}
            />
          </Route>
          <Route path="/details">
            <DeviceDetailsView readonly={!auth.canManageNode} node={data} />
          </Route>
          <FeatureRoute path="/subnets" feature="advertise-routes" node={data}>
            <SubnetRouterView
              readonly={!auth.canManageNode}
              node={data}
              nodeUpdaters={nodeUpdaters}
            />
          </FeatureRoute>
          <FeatureRoute path="/ssh" feature="ssh" node={data}>
            <SSHView
              readonly={!auth.canManageNode}
              node={data}
              nodeUpdaters={nodeUpdaters}
            />
          </FeatureRoute>
          <Route path="/serve">{/* TODO */}Share local content</Route>
          <FeatureRoute path="/update" feature="auto-update" node={data}>
            <UpdatingView
              versionInfo={data.ClientVersion}
              currentVersion={data.IPNVersion}
            />
          </FeatureRoute>
          <Route>
            <div className="mt-8 card">Page not found</div>
          </Route>
        </Switch>
      </Router>
    </>
  )
}

/**
 * FeatureRoute renders a Route component,
 * but only displays the child view if the specified feature is
 * available for use on this node's platform. If not available,
 * a not allowed view is rendered instead.
 */
function FeatureRoute({
  path,
  node,
  feature,
  children,
}: {
  path: string
  node: NodeData // TODO: once we have swr, just call useNodeData within FeatureView
  feature: Feature
  children: React.ReactNode
}) {
  return (
    <Route path={path}>
      {!node.Features[feature] ? (
        <div className="mt-8 card">
          {featureDescription(feature)} not available on this device.
        </div>
      ) : (
        children
      )}
    </Route>
  )
}

function Header({
  node,
  auth,
  newSession,
}: {
  node: NodeData
  auth: AuthResponse
  newSession: () => Promise<void>
}) {
  const [loc] = useLocation()

  return (
    <>
      <div className="flex flex-wrap gap-4 justify-between items-center mb-9 md:mb-12">
        <Link to="/" className="flex gap-3 overflow-hidden">
          <TailscaleIcon />
          <div className="inline text-gray-800 text-lg font-medium leading-snug truncate">
            {node.DomainName}
          </div>
        </Link>
        <LoginToggle node={node} auth={auth} newSession={newSession} />
      </div>
      {loc !== "/" && loc !== "/update" && (
        <Link to="/" className="link font-medium block mb-2">
          &larr; Back to {node.DeviceName}
        </Link>
      )}
    </>
  )
}

/**
 * LoadingView fills its container with small animated loading dots
 * in the center.
 */
export function LoadingView() {
  return (
    <LoadingDots className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
  )
}
