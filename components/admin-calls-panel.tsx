"use client"

import { useEffect, useState, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Phone, PhoneOff, PhoneIncoming, Mic, MicOff } from "lucide-react"
import type { CallRequest } from "@/lib/types"
import { getPendingCallRequestsAction, updateCallStatusAction } from "@/app/actions/calls"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"

export function AdminCallsPanel() {
  const { toast } = useToast()
  const [requests, setRequests] = useState<CallRequest[]>([])
  const [activeCall, setActiveCall] = useState<CallRequest | null>(null)
  const [muted, setMuted] = useState(false)

  const localStreamRef = useRef<MediaStream | null>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const remoteAudioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    loadRequests()
    const interval = setInterval(loadRequests, 3000)
    return () => clearInterval(interval)
  }, [])

  async function loadRequests() {
    try {
      const result = await getPendingCallRequestsAction()
      if (result && result.success && result.requests) {
        setRequests(result.requests)
        return
      }
    } catch (err) {
      console.error("[AdminCalls] Server Action loadRequests failed:", err)
    }

    // Fallback to HTTP API
    try {
      const res = await fetch("/api/calls")
      if (res.ok) {
        const data = await res.json()
        setRequests(data || [])
      } else {
        console.warn("[AdminCalls] /api/calls returned non-ok", res.status)
      }
    } catch (err) {
      console.error("[AdminCalls] HTTP fallback loadRequests failed:", err)
    }
  }

  async function acceptCall(request: CallRequest) {
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      localStreamRef.current = stream

      // Update call status
      try {
        await updateCallStatusAction(request.id, "accepted")
      } catch (err) {
        console.error("[AdminCalls] updateCallStatusAction failed, falling back to HTTP:", err)
        try {
          await fetch(`/api/calls`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: request.id, status: "accepted" }),
          })
        } catch (ferr) {
          console.error("[AdminCalls] HTTP fallback update failed:", ferr)
        }
      }
      setActiveCall(request)

      // Initialize WebRTC
      const configuration: RTCConfiguration = {
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }],
      }

      const peerConnection = new RTCPeerConnection(configuration)
      peerConnectionRef.current = peerConnection

      // Add local stream tracks
      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream)
      })

      // Handle incoming tracks
      peerConnection.ontrack = (event) => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = event.streams[0]
        }
      }

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log("[LMSAlphadateE candidate:", event.candidate)
        }
      }

      peerConnection.onconnectionstatechange = () => {
        console.log("[LM] Admin connection state:", peerConnection.connectionState)
        if (peerConnection.connectionState === "disconnected" || peerConnection.connectionState === "failed") {
          endCall()
        }
      }

      toast({
        title: "Дзвінок прийнято",
        description: `З'єднання з ${request.userName}`,
      })

      loadRequests()
    } catch (error) {
      console.error("[LMSAlphadateSAlphadate] Error accepting call:", error)
      toast({
        variant: "destructive",
        title: "Помилка",
        description: "Не вдалося прийняти дзвінок",
      })
    }
  }

  async function rejectCall(request: CallRequest) {
    try {
      await updateCallStatusAction(request.id, "rejected")
    } catch (err) {
      console.error("[AdminCalls] updateCallStatusAction(reject) failed, falling back to HTTP:", err)
      try {
        await fetch(`/api/calls`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: request.id, status: "rejected" }),
        })
      } catch (ferr) {
        console.error("[AdminCalls] HTTP fallback reject failed:", ferr)
      }
    }
    toast({
      title: "Дзвінок відхилено",
    })
    loadRequests()
  }

  function toggleMute() {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setMuted(!audioTrack.enabled)
      }
    }
  }

  async function endCall() {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }

    if (activeCall) {
      try {
        await updateCallStatusAction(activeCall.id, "ended")
      } catch (err) {
        console.error("[AdminCalls] updateCallStatusAction(end) failed, falling back to HTTP:", err)
        try {
          await fetch(`/api/calls`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: activeCall.id, status: "ended" }),
          })
        } catch (ferr) {
          console.error("[AdminCalls] HTTP fallback end failed:", ferr)
        }
      }
    }

    setActiveCall(null)
    setMuted(false)
    loadRequests()
  }

  return (
    <>
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <PhoneIncoming className="h-5 w-5" />
            <h3 className="font-semibold">Вхідні дзвінки</h3>
          </div>
          {requests.length > 0 && <Badge variant="destructive">{requests.length}</Badge>}
        </div>

        {activeCall ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-accent rounded-lg">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <Phone className="h-6 w-6 text-green-500" />
              </div>
              <div className="flex-1">
                <p className="font-medium">{activeCall.userName}</p>
                <p className="text-sm text-muted-foreground">Дзвінок активний</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={toggleMute} variant="outline" size="icon" className="rounded-full bg-transparent">
                {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </Button>

              <Button onClick={endCall} variant="destructive" className="flex-1 gap-2">
                <PhoneOff className="h-5 w-5" />
                Завершити
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Немає вхідних дзвінків</p>
            ) : (
              requests.map((request) => (
                <div key={request.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{request.userName}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(request.createdAt).toLocaleTimeString("uk-UA")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => acceptCall(request)} size="sm" className="gap-1">
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => rejectCall(request)} size="sm" variant="outline">
                      <PhoneOff className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </Card>

      <audio ref={remoteAudioRef} autoPlay />
    </>
  )
}
