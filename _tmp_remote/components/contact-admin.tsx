"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Phone, PhoneOff, Mic, MicOff } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { createCallRequestAction, getCallRequestAction, updateCallStatusAction } from "@/app/actions/calls"
import { getAllAdminsAction } from "@/app/actions/auth"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function ContactAdmin() {
  const { toast } = useToast()
  const [calling, setCalling] = useState(false)
  const [callId, setCallId] = useState<string | null>(null)
  const [muted, setMuted] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">("disconnected")
  const [admins, setAdmins] = useState<{ id: string; name: string }[]>([])
  const [selectedAdminId, setSelectedAdminId] = useState<string>("")

  const localStreamRef = useRef<MediaStream | null>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const remoteAudioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    async function loadAdmins() {
      const result = await getAllAdminsAction()
      if (result.success && result.admins) {
        setAdmins(result.admins)
        if (result.admins.length > 0) {
          setSelectedAdminId(result.admins[0].id)
        }
      }
    }
    loadAdmins()
  }, [])

  useEffect(() => {
    if (calling && callId) {
      const interval = setInterval(async () => {
        const result = await getCallRequestAction(callId)
        if (result.success && result.request) {
          if (result.request.status === "accepted") {
            setConnectionStatus("connected")
            toast({
              title: "Дзвінок прийнято",
              description: "Адміністратор приєднався до дзвінка",
            })
          } else if (result.request.status === "rejected") {
            handleEndCall()
            toast({
              variant: "destructive",
              title: "Дзвінок відхилено",
              description: "Адміністратор недоступний",
            })
          }
        }
      }, 2000)

      return () => clearInterval(interval)
    }
  }, [calling, callId])

  async function handleCall() {
    if (!selectedAdminId) {
      toast({
        variant: "destructive",
        title: "Помилка",
        description: "Будь ласка, виберіть адміністратора",
      })
      return
    }

    try {
      setConnectionStatus("connecting")

      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      localStreamRef.current = stream

      // Create call request
      const result = await createCallRequestAction()
      if (result.success && result.request) {
        setCallId(result.request.id)
        setCalling(true)

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

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            console.log("[LMSAlphadatecandidate:", event.candidate)
          }
        }

        // Monitor connection state
        peerConnection.onconnectionstatechange = () => {
          console.log("[LM] Connection state:", peerConnection.connectionState)
          if (peerConnection.connectionState === "connected") {
            setConnectionStatus("connected")
          } else if (peerConnection.connectionState === "disconnected" || peerConnection.connectionState === "failed") {
            handleEndCall()
          }
        }

        const selectedAdmin = admins.find((a) => a.id === selectedAdminId)
        toast({
          title: "Очікування відповіді",
          description: `Чекаємо на підключення ${selectedAdmin?.name || "адміністратора"}...`,
        })
      }
    } catch (error) {
      console.error("[LMSAlphadateSAlphadate] Error starting call:", error)
      toast({
        variant: "destructive",
        title: "Помилка",
        description: "Не вдалося розпочати дзвінок. Перевірте доступ до мікрофону.",
      })
      handleEndCall()
    }
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

  async function handleEndCall() {
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }

    // Update call status
    if (callId) {
      await updateCallStatusAction(callId, "ended")
    }

    setCalling(false)
    setCallId(null)
    setMuted(false)
    setConnectionStatus("disconnected")
  }

  return (
    <>
      <Card className="p-8 max-w-2xl">
        <div className="text-center space-y-6">
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">Голосовий дзвінок</h3>
            <p className="text-muted-foreground">
              {calling ? "Дзвінок активний" : "Виберіть адміністратора та натисніть кнопку для дзвінка"}
            </p>
          </div>

          {calling ? (
            <div className="space-y-4">
              <div className="flex justify-center">
                <div
                  className={`w-24 h-24 rounded-full flex items-center justify-center ${
                    connectionStatus === "connected" ? "bg-green-500/10" : "bg-primary/10 animate-pulse"
                  }`}
                >
                  <Phone
                    className={`h-12 w-12 ${connectionStatus === "connected" ? "text-green-500" : "text-primary"}`}
                  />
                </div>
              </div>

              <div>
                <p className="text-sm font-medium">
                  {connectionStatus === "connecting" && "Очікування відповіді..."}
                  {connectionStatus === "connected" && "Дзвінок активний"}
                  {connectionStatus === "disconnected" && "З'єднання розірвано"}
                </p>
              </div>

              <div className="flex gap-2 justify-center">
                <Button onClick={toggleMute} variant="outline" size="icon" className="rounded-full bg-transparent">
                  {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </Button>

                <Button onClick={handleEndCall} variant="destructive" size="lg" className="gap-2 rounded-full">
                  <PhoneOff className="h-5 w-5" />
                  Завершити дзвінок
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="max-w-xs mx-auto">
                <Select value={selectedAdminId} onValueChange={setSelectedAdminId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Виберіть адміністратора" />
                  </SelectTrigger>
                  <SelectContent>
                    {admins.map((admin) => (
                      <SelectItem key={admin.id} value={admin.id}>
                        {admin.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleCall} size="lg" className="gap-2" disabled={!selectedAdminId}>
                <Phone className="h-5 w-5" />
                Зателефонувати
              </Button>
            </div>
          )}

          <div className="pt-6 border-t">
            <p className="text-xs text-muted-foreground">Використовується WebRTC для peer-to-peer з'єднання</p>
          </div>
        </div>
      </Card>

      <audio ref={remoteAudioRef} autoPlay />
    </>
  )
}
