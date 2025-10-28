import * as React from "react"

import type { ToastActionElement, ToastProps } from "@/components/ui/toast"

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 10000

type ToastsMap = {
  [key: string]: ToastProps & {
    id: string
    title?: React.ReactNode
    description?: React.ReactNode
    action?: ToastActionElement
  }
}

type State = {
  toasts: ToastsMap
}

const initialState: State = {
  toasts: {},
}

type Action =
  | {
      type: "ADD_TOAST"
      toast: ToastProps & {
        id: string
        title?: React.ReactNode
        description?: React.ReactNode
        action?: ToastActionElement
      }
    }
  | {
      type: "UPDATE_TOAST"
      toast: Partial<ToastProps> & { id: string }
    }
  | {
      type: "DISMISS_TOAST"
      toastId?: string
    }
  | {
      type: "REMOVE_TOAST"
      toastId: string
    }

let count = 0

function genId() {
  count = (count + 1) % 100000
  return `toast-${count}`
}

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: {
          ...state.toasts,
          [action.toast.id]: action.toast,
        },
      }

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: {
          ...state.toasts,
          [action.toast.id]: {
            ...state.toasts[action.toast.id],
            ...action.toast,
          },
        },
      }

    case "DISMISS_TOAST": {
      const { toastId } = action
      
      if (toastId) {
        const { [toastId]: dismissedToast, ...rest } = state.toasts
        if (dismissedToast) {
          dismissedToast.open = false
          return {
            ...state,
            toasts: {
              ...rest,
              [toastId]: dismissedToast,
            },
          }
        }
      }
      
      // Dismiss all
      const dismissedToasts = Object.values(state.toasts).map(toast => ({
        ...toast,
        open: false
      }))
      
      return {
        ...state,
        toasts: dismissedToasts.reduce((acc, toast) => {
          acc[toast.id] = toast
          return acc
        }, {} as ToastsMap)
      }
    }

    case "REMOVE_TOAST": {
      const { toastId } = action
      const { [toastId]: _, ...rest } = state.toasts

      return {
        ...state,
        toasts: rest,
      }
    }
  }
}

const listeners: Array<(state: State) => void> = []

let state = initialState

function setState(data: State) {
  state = data
  listeners.forEach((listener) => listener(state))
}

function useToast() {
  const [toasts, setToasts] = React.useState(state.toasts)

  React.useEffect(() => {
    const listener = (state: State) => {
      setToasts(state.toasts)
    }

    listeners.push(listener)
    return () => {
      const index = listeners.indexOf(listener)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [toasts])

  return {
    toasts: Object.values(toasts),
    ...actions,
  }
}

type Toast = Omit<Action, "type">["toast"]

function addToast({ ...toast }: Toast) {
  const id = genId()

  setState(reducer(state, {
    type: "ADD_TOAST",
    toast: {
      ...toast,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) {
          actions.dismiss(id)
        }
      },
    },
  }))

  return id
}

function updateToast(toast: Partial<Toast> & { id: string }) {
  setState(reducer(state, { type: "UPDATE_TOAST", toast }))
}

function dismissToast(toastId?: string) {
  setState(reducer(state, { type: "DISMISS_TOAST", toastId }))
}

function removeToast(toastId: string) {
  setState(reducer(state, { type: "REMOVE_TOAST", toastId }))
}

const actions = {
  add: addToast,
  update: updateToast,
  dismiss: dismissToast,
  remove: removeToast,
}

export { useToast, actions }