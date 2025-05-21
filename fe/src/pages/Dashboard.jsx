"use client"

import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Plus, Search, Filter, Users } from "lucide-react"
import { useAuth } from "../lib/auth-context"
import { useSocket } from "../lib/socket-context"
import { debates } from "../lib/api"
import { toast } from "sonner"

import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu"
import { Badge } from "../components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog"
import { Label } from "../components/ui/label"
import { Textarea } from "../components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select"

export default function Dashboard() {
  const { user } = useAuth()
  const socket = useSocket()
  const [debatesList, setDebatesList] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [categories, setCategories] = useState([])
  const [newDebate, setNewDebate] = useState({
    topic: "",
    description: "",
    categoryId: ""
  })
  const navigate = useNavigate()

  useEffect(() => {
    fetchDebates()
    fetchCategories()

    socket.on('newDebate', (debate) => {
      setDebatesList(prev => [debate, ...prev])
      toast.success('New debate created!')
    })

    socket.on('debateStatusUpdated', ({ debateId, status, debate }) => {
      setDebatesList(prev => prev.map(d => d.id === debateId ? debate : d))
      toast.info(`Debate status updated to ${status.toLowerCase()}`)
    })

    socket.on('participantJoined', ({ debateId, participant }) => {
      setDebatesList(prev => prev.map(debate => {
        if (debate.id === debateId) {
          return {
            ...debate,
            participants: [...debate.participants, participant]
          }
        }
        return debate
      }))
    })

    return () => {
      socket.off('newDebate')
      socket.off('debateStatusUpdated')
      socket.off('participantJoined')
    }
  }, [socket])

  const fetchCategories = async () => {
    try {
      const response = await fetch('http://localhost:5000/categories')
      const data = await response.json()
      setCategories(data)
    } catch (error) {
      toast.error('Failed to fetch categories')
    }
  }

  const fetchDebates = async () => {
    try {
      setLoading(true)
      const response = await debates.getAll({
        search: searchQuery,
        categoryId: categoryFilter
      })
      setDebatesList(response.data.debates)
    } catch (error) {
      toast.error('Failed to fetch debates')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateDebate = async (e) => {
    e.preventDefault()
    try {
      const response = await debates.create(newDebate)
      setShowCreateDialog(false)
      setNewDebate({ topic: "", description: "", categoryId: "" })
      toast.success('Debate created successfully')
      navigate(`/debate/${response.data.debate.id}`)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create debate')
    }
  }

  const handleJoinDebate = async (debateId, role) => {
    try {
      await debates.join(debateId, role)
      toast.success(`Joined as ${role.toLowerCase()}`)
      fetchDebates() // Refresh the list
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to join debate')
    }
  }

  const getStatusBadge = (status) => {
    const statusColors = {
      WAITING: "bg-yellow-500",
      ONGOING: "bg-blue-500",
      FINISHED: "bg-green-500",
    }
    return (
      <Badge className={statusColors[status]}>
        {status.charAt(0) + status.slice(1).toLowerCase()}
      </Badge>
    )
  }

  const getParticipantCounts = (participants) => {
    const debaters = participants.filter(p => p.role === 'DEBATER').length
    const audience = participants.filter(p => p.role === 'AUDIENCE').length
    return { debaters, audience }
  }

  const canJoinAsDebater = (debate) => {
    const { debaters } = getParticipantCounts(debate.participants)
    return debate.status === 'WAITING' && debaters < 2 && !debate.participants.some(p => p.userId === user.id)
  }

  const canJoinAsAudience = (debate) => {
    return (debate.status === 'WAITING' || debate.status === 'ONGOING') && 
           !debate.participants.some(p => p.userId === user.id)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <h1 className="text-xl font-bold">Debate Area</h1>
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.avatar || "/placeholder-user.jpg"} alt={user?.name} />
                    <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Link to="/profile" className="w-full">
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link to="/settings" className="w-full">
                    Settings
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-6">
        {/* Filters and Search */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-2">
            <Input
              placeholder="Search debates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
            <Select
              value={categoryFilter}
              onValueChange={setCategoryFilter}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Debate
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Debate</DialogTitle>
                <DialogDescription>
                  Start a new debate by providing the topic and description.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateDebate}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="topic">Topic</Label>
                    <Input
                      id="topic"
                      value={newDebate.topic}
                      onChange={(e) => setNewDebate(prev => ({ ...prev, topic: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newDebate.description}
                      onChange={(e) => setNewDebate(prev => ({ ...prev, description: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={newDebate.categoryId}
                      onValueChange={(value) => setNewDebate(prev => ({ ...prev, categoryId: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Create Debate</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Debates Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <div className="col-span-full text-center">Loading debates...</div>
          ) : debatesList.length === 0 ? (
            <div className="col-span-full text-center">No active debates found</div>
          ) : (
            debatesList.map((debate) => {
              const { debaters, audience } = getParticipantCounts(debate.participants)
              const isParticipant = debate.participants.some(p => p.userId === user.id)
              
              return (
                <Card key={debate.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-xl">{debate.topic}</CardTitle>
                      {getStatusBadge(debate.status)}
                    </div>
                    <CardDescription>{debate.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{debaters} debaters, {audience} audience</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Category: {debate.category?.name || 'Uncategorized'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Created: {new Date(debate.createdAt).toLocaleDateString()}
                      </p>
                      {!isParticipant && (
                        <div className="flex gap-2">
                          {canJoinAsDebater(debate) && (
                            <Button
                              variant="outline"
                              className="flex-1"
                              onClick={() => handleJoinDebate(debate.id, 'DEBATER')}
                            >
                              Join as Debater
                            </Button>
                          )}
                          {canJoinAsAudience(debate) && (
                            <Button
                              className="flex-1"
                              onClick={() => handleJoinDebate(debate.id, 'AUDIENCE')}
                            >
                              Join as Audience
                            </Button>
                          )}
                        </div>
                      )}
                      {isParticipant && (
                        <Button
                          variant="outline"
                          className="w-full"
                          asChild
                        >
                          <Link to={`/debate/${debate.id}`}>View Debate</Link>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </main>
    </div>
  )
}
