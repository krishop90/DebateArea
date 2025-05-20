"use client"

import { useState } from "react"
import { useParams, Link } from "react-router-dom"
import { ArrowLeft, MessageSquare, ThumbsDown, ThumbsUp, Users } from "lucide-react"

import { Button } from "../components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar"
import { Badge } from "../components/ui/badge"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card"
import { Textarea } from "../components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs"

export default function DebatePage() {
  const { id } = useParams()
  const [activeTab, setActiveTab] = useState("debate")
  const [comment, setComment] = useState("")

  // Mock data for a specific debate
  const debate = {
    id: Number.parseInt(id),
    topic: "Universal Basic Income: Solution or Problem?",
    description:
      "Examining the economic and social impacts of implementing a universal basic income system. This debate will explore the potential benefits and drawbacks of UBI, including its effects on poverty, work incentives, economic growth, and government budgets.",
    status: "ONGOING",
    category: "Economics",
    participants: [
      {
        id: 1,
        userId: 1,
        role: "DEBATER",
        position:
          "UBI is necessary for economic stability and social welfare. It provides a safety net that allows people to meet their basic needs, reduces poverty, and gives people the freedom to pursue education, entrepreneurship, and creative endeavors without the constant stress of financial insecurity.",
        user: {
          name: "Alex Johnson",
          avatar: "/placeholder-user.jpg",
        },
        votes: { up: 24, down: 8 },
      },
      {
        id: 2,
        userId: 2,
        role: "DEBATER",
        position:
          "UBI is economically unsustainable and socially harmful. It would require massive tax increases, potentially reduce work incentives, and create dependency on government. Resources would be better spent on targeted assistance programs and job creation initiatives.",
        user: {
          name: "Sam Rivera",
          avatar: "/placeholder-user.jpg",
        },
        votes: { up: 18, down: 12 },
      },
      { id: 3, userId: 3, role: "AUDIENCE", user: { name: "Taylor Smith" } },
      { id: 4, userId: 4, role: "AUDIENCE", user: { name: "Jordan Lee" } },
      { id: 5, userId: 5, role: "AUDIENCE", user: { name: "Casey Wong" } },
      { id: 6, userId: 6, role: "AUDIENCE", user: { name: "Riley Garcia" } },
      { id: 7, userId: 7, role: "AUDIENCE", user: { name: "Morgan Chen" } },
    ],
    comments: [
      {
        id: 1,
        content:
          "I think both sides make valid points, but we need to consider the practical implementation challenges of UBI.",
        user: { name: "Taylor Smith", avatar: "/placeholder-user.jpg" },
        createdAt: "2023-05-14T16:30:00Z",
      },
      {
        id: 2,
        content:
          "Has anyone looked at the pilot programs in Finland and Canada? They provide some interesting data points for this discussion.",
        user: { name: "Jordan Lee", avatar: "/placeholder-user.jpg" },
        createdAt: "2023-05-14T17:15:00Z",
      },
      {
        id: 3,
        content: "I'd like to see more discussion about how UBI would interact with existing welfare programs.",
        user: { name: "Casey Wong", avatar: "/placeholder-user.jpg" },
        createdAt: "2023-05-14T18:05:00Z",
      },
    ],
    createdAt: "2023-05-14T14:20:00Z",
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case "WAITING":
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Waiting</Badge>
      case "ONGOING":
        return <Badge className="bg-green-500 hover:bg-green-600">Ongoing</Badge>
      case "FINISHED":
        return <Badge className="bg-gray-500 hover:bg-gray-600">Finished</Badge>
      default:
        return <Badge>Unknown</Badge>
    }
  }

  const debaters = debate.participants.filter((p) => p.role === "DEBATER")
  const audience = debate.participants.filter((p) => p.role === "AUDIENCE")

  const handleSubmitComment = () => {
    if (comment.trim()) {
      // In a real app, you would send this to an API
      alert("Comment submitted: " + comment)
      setComment("")
    }
  }

  const handleVote = (participantId, voteType) => {
    // In a real app, you would send this to an API
    alert(`Voted ${voteType} for participant ${participantId}`)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center">
          <Link to="/" className="flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Debate Info */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-2xl">{debate.topic}</CardTitle>
                    <CardDescription className="mt-1">Created on {formatDate(debate.createdAt)}</CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{debate.category}</Badge>
                    {getStatusBadge(debate.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{debate.description}</p>
              </CardContent>
            </Card>

            {/* Tabs for Debate and Comments */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="debate">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Debate
                </TabsTrigger>
                <TabsTrigger value="audience">
                  <Users className="mr-2 h-4 w-4" />
                  Audience ({audience.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="debate" className="mt-4 space-y-4">
                {/* Debaters */}
                {debaters.map((debater, index) => (
                  <Card key={debater.id}>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Avatar>
                          <AvatarImage src={debater.user.avatar || "/placeholder.svg"} alt={debater.user.name} />
                          <AvatarFallback>{debater.user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg">{debater.user.name}</CardTitle>
                          <CardDescription>Debater {index + 1}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{debater.position}</p>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                      <div className="flex items-center gap-4">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() => handleVote(debater.id, "up")}
                        >
                          <ThumbsUp className="h-4 w-4" />
                          <span>{debater.votes.up}</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() => handleVote(debater.id, "down")}
                        >
                          <ThumbsDown className="h-4 w-4" />
                          <span>{debater.votes.down}</span>
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                ))}

                {/* Comments */}
                <div className="mt-8">
                  <h3 className="mb-4 text-lg font-medium">Comments ({debate.comments.length})</h3>
                  <div className="space-y-4">
                    {debate.comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={comment.user.avatar || "/placeholder.svg"} alt={comment.user.name} />
                          <AvatarFallback>{comment.user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{comment.user.name}</span>
                            <span className="text-xs text-muted-foreground">{formatDate(comment.createdAt)}</span>
                          </div>
                          <p className="text-sm">{comment.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Comment */}
                  <div className="mt-6">
                    <Textarea
                      placeholder="Add your comment..."
                      className="mb-2"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                    />
                    <Button size="sm" disabled={!comment.trim()} onClick={handleSubmitComment}>
                      Post Comment
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="audience" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Audience Members</CardTitle>
                    <CardDescription>People watching and participating in this debate</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {audience.map((member) => (
                        <div key={member.id} className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>{member.user.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span>{member.user.name}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" size="sm">
                      Join as Audience
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Debate Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="font-medium">{debate.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Category:</span>
                  <span className="font-medium">{debate.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Debaters:</span>
                  <span className="font-medium">{debaters.length}/2</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Audience:</span>
                  <span className="font-medium">{audience.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Comments:</span>
                  <span className="font-medium">{debate.comments.length}</span>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-2">
                {debate.status === "WAITING" && debaters.length < 2 && (
                  <Button className="w-full">Join as Debater</Button>
                )}
                {(debate.status === "WAITING" || debate.status === "ONGOING") && (
                  <Button variant="outline" className="w-full">
                    Join as Audience
                  </Button>
                )}
                {debate.status === "FINISHED" && (
                  <Button variant="outline" className="w-full">
                    View Results
                  </Button>
                )}
              </CardFooter>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Related Debates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Link to="#" className="block hover:underline">
                    Economic Inequality: Causes and Solutions
                  </Link>
                  <Link to="#" className="block hover:underline">
                    Automation and the Future of Work
                  </Link>
                  <Link to="#" className="block hover:underline">
                    Welfare Reform: What Works?
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
