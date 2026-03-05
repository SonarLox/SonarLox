import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  pluginName: string
  onReset?: () => void
}

interface State {
  hasError: boolean
  error: Error | null
}

export class PluginErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Plugin "${this.props.pluginName}" crashed during render:`, error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return <group />
    }
    return this.props.children
  }
}
