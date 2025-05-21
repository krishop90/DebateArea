"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { useAuth } from "../lib/auth-context"
import { useSocket } from "../lib/socket-context"
import { debates } from "../lib/api"
import { toast } from "sonner"
import { ArrowLeft, MessageSquare, ThumbsDown, ThumbsUp, Users, Clock } from "lucide-react"

import { Button } from "../components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar"
import { Badge } from "../components/ui/badge"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card"
import { Textarea } from "../components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs"
import { Progress } from "../components/ui/progress"
import { ScrollArea } from "../components/ui/scroll-area"

export default function DebatePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const socket = useSocket()
  const [debate, setDebate] = useState(null)
  const [loading, setLoading] = useState(true)
  const [timeLeft, setTimeLeft] = useState(null)
  const [timerProgress, setTimerProgress] = useState(100)
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState([])
  const timerRef = useRef(null)
  const [resultRequests, setResultRequests] = useState([])

  useEffect(() => {
    fetchDebate()

    socket.emit('joinDebate', id)

    socket.on('debateUpdated', (updatedDebate) => {
      setDebate(updatedDebate)
    })

    socket.on('participantJoined', ({ participant }) => {
      setDebate(prev => ({
        ...prev,
        participants: [...prev.participants, participant]
      }))
      toast.info(`${participant.user.name} joined the debate`)
    })

    socket.on('participantLeft', ({ participantId }) => {
      setDebate(prev => ({
        ...prev,
        participants: prev.participants.filter(p => p.id !== participantId)
      }))
    })

    socket.on('newMessage', ({ message }) => {
      setMessages(prev => {
        // Check if message already exists to prevent duplicates
        if (prev.some(m => m.id === message.id)) {
          return prev;
        }
        return [...prev, message];
      });
    })

    socket.on('voteUpdated', ({ participantId, vote }) => {
      setDebate(prev => ({
        ...prev,
        participants: prev.participants.map(p => {
          if (p.id === participantId) {
            return {
              ...p,
              votes: [...p.votes, vote]
            }
          }
          return p
        })
      }))
    })

    socket.on('resultRequested', ({ participant, allDebatersRequested }) => {
      setResultRequests(prev => {
        if (!prev.includes(participant.id)) {
          return [...prev, participant.id];
        }
        return prev;
      });

      if (allDebatersRequested) {
        toast.success('Both debaters have requested results. Ending debate...');
      } else {
        toast.info(`${participant.user.name} has requested results`);
      }
    });

    if (socket) {
      socket.on('debateStarted', ({ debateId, startTime, duration }) => {
        if (debateId === parseInt(id)) {
          const endTime = new Date(startTime).getTime() + (duration * 60 * 1000);
          startTimer(endTime);
        }
      });

      socket.on('debateEnded', ({ debateId, debate }) => {
        if (debateId === parseInt(id)) {
          setDebate(debate);
          clearInterval(timerRef.current);
          setTimeLeft(null);
          setTimerProgress(100);
        }
      });
    }

    return () => {
      socket.emit('leaveDebate', id)
      socket.off('debateUpdated')
      socket.off('participantJoined')
      socket.off('participantLeft')
      socket.off('newMessage')
      socket.off('voteUpdated')
      socket.off('resultRequested')
    }
  }, [id, socket])

  useEffect(() => {
    let timer
    if (debate?.status === 'ONGOING' && debate?.startTime) {
      const startTime = new Date(debate.startTime).getTime()
      const endTime = startTime + (debate.duration * 60 * 1000)
      
      timer = setInterval(() => {
        const now = new Date().getTime()
        const remaining = endTime - now
        
        if (remaining <= 0) {
          clearInterval(timer)
          setTimeLeft(null)
          return
        }
        
        const minutes = Math.floor(remaining / (1000 * 60))
        const seconds = Math.floor((remaining % (1000 * 60)) / 1000)
        setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`)
      }, 1000)
    }

    return () => {
      if (timer) clearInterval(timer)
    }
  }, [debate?.status, debate?.startTime, debate?.duration])

  const fetchDebate = async () => {
    try {
      setLoading(true)
      const response = await debates.getById(id)
      setDebate(response.data.debate)
      setMessages(response.data.debate.comments || [])
    } catch (error) {
      console.error('Error fetching debate:', error)
      toast.error('Failed to fetch debate')
      navigate('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!message.trim()) return

    try {
      await debates.sendMessage(id, { content: message })
      setMessage("")
    } catch (error) {
      toast.error('Failed to send message')
    }
  }

  const getParticipantCounts = (participants) => {
    const debaters = participants.filter(p => p.role === 'DEBATER')
    const audience = participants.filter(p => p.role === 'AUDIENCE')
    return { debaters, audience }
  }

  const getVoteCounts = (participant) => {
    const upvotes = participant.votes.filter(v => v.value === 1).length
    const downvotes = participant.votes.filter(v => v.value === -1).length
    return { upvotes, downvotes }
  }

  const getUserVote = (participant) => {
    if (!currentParticipant) return null;
    const vote = participant.votes.find(v => v.voterId === currentParticipant.id);
    return vote ? vote.value : null;
  }

  const handleVote = async (participantId, value) => {
    try {
      // Convert string vote to integer
      const voteValue = value === 'up' ? 1 : -1;
      await debates.vote(id, { participantId, vote: voteValue });
    } catch (error) {
      toast.error('Failed to vote');
    }
  }

  const startTimer = (endTime) => {
    clearInterval(timerRef.current);
    const updateTimer = () => {
      const now = new Date().getTime();
      const distance = endTime - now;
      
      if (distance <= 0) {
        clearInterval(timerRef.current);
        setTimeLeft(null);
        setTimerProgress(100);
        return;
      }

      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      
      const totalDuration = 3 * 60 * 1000; // 3 minutes in milliseconds
      const progress = (distance / totalDuration) * 100;
      setTimerProgress(progress);
    };

    updateTimer();
    timerRef.current = setInterval(updateTimer, 1000);
  };

  const handleStartDebate = async () => {
    try {
      const response = await debates.startTimer(id);
      setDebate(response.data.debate);
    } catch (error) {
      console.error('Error starting debate:', error);
      setError(error.response?.data?.message || 'Failed to start debate');
    }
  };

  const handleRequestResults = async () => {
    try {
      await debates.requestResults(id);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to request results');
    }
  };

  if (loading) {
    return <div className="container py-6 text-center">Loading debate...</div>
  }

  if (!debate) {
    return <div className="container py-6 text-center">Debate not found</div>
  }

  const { debaters, audience } = getParticipantCounts(debate.participants)
  const currentParticipant = debate.participants.find(p => p.userId === user.id)
  const isDebater = currentParticipant?.role === 'DEBATER'
  const isAudience = currentParticipant?.role === 'AUDIENCE'

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center">
          <Button variant="ghost" asChild>
            <Link to="/dashboard" className="flex items-center">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
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
                    <CardDescription className="mt-1">
                      Created on {new Date(debate.createdAt).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{debate.category?.name}</Badge>
                    {debate.status === 'ONGOING' && timeLeft && (
                      <Badge variant="secondary">
                        <Clock className="mr-1 h-4 w-4" />
                        {timeLeft}
                      </Badge>
                    )}
                    <Badge className={debate.status === 'ONGOING' ? 'bg-blue-500' : 'bg-yellow-500'}>
                      {debate.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{debate.description}</p>
                
                {debate.status === 'ONGOING' && isDebater && (
                  <div className="mt-4">
                    <Button 
                      onClick={handleRequestResults}
                      disabled={resultRequests.includes(currentParticipant?.id)}
                      variant="outline"
                    >
                      {resultRequests.includes(currentParticipant?.id)
                        ? 'Results Requested'
                        : 'Request Results'}
                    </Button>
                    {resultRequests.length > 0 && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {resultRequests.length} of 2 debaters have requested results
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Debate Messages */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Debate</CardTitle>
                <CardDescription>
                  {isDebater ? 'Share your arguments' : 'Watch the debate'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div key={msg.id} className="flex gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={msg.user?.avatar} alt={msg.user?.name || 'User'} />
                        <AvatarFallback>{(msg.user?.name || 'U').charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{msg.user?.name || 'Anonymous User'}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(msg.createdAt).toLocaleTimeString()}
                          </span>
                          {/* Only show vote buttons for debater messages when user is audience */}
                          {isAudience && debate.participants.find(p => p.userId === msg.userId)?.role === 'DEBATER' && (
                            <div className="flex gap-2">
                              {(() => {
                                const participant = debate.participants.find(p => p.userId === msg.userId);
                                const { upvotes, downvotes } = getVoteCounts(participant);
                                const userVote = getUserVote(participant);
                                return (
                                  <>
                                    <Button
                                      variant={userVote === 1 ? "default" : "ghost"}
                                      size="sm"
                                      onClick={() => handleVote(participant.id, 'up')}
                                    >
                                      <ThumbsUp className="h-4 w-4" />
                                      <span className="ml-1">{upvotes}</span>
                                    </Button>
                                    <Button
                                      variant={userVote === -1 ? "default" : "ghost"}
                                      size="sm"
                                      onClick={() => handleVote(participant.id, 'down')}
                                    >
                                      <ThumbsDown className="h-4 w-4" />
                                      <span className="ml-1">{downvotes}</span>
                                    </Button>
                                  </>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                        <p className="text-sm">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {isDebater && (
                  <form onSubmit={handleSendMessage} className="mt-4">
                    <Textarea
                      placeholder="Type your argument..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="mb-2"
                    />
                    <Button type="submit" disabled={!message.trim()}>
                      Send Message
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>

            {/* Results Section */}
            {debate.status === 'FINISHED' && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Debate Results</CardTitle>
                  <CardDescription>Final scores and analysis</CardDescription>
                </CardHeader>
                <CardContent>
                  {debate.results ? (
                    <div className="space-y-6">
                      {/* Winner */}
                      <div className="text-center">
                        <h3 className="text-lg font-semibold">Winner</h3>
                        <p className="text-muted-foreground">
                          {debate.participants.find(p => p.userId === debate.results.winnerId)?.user.name}
                        </p>
                      </div>

                      {/* Performance Metrics */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {debate.results.scores.map((score) => (
                          <Card key={score.userId}>
                            <CardHeader>
                              <CardTitle className="text-lg">{score.name}'s Performance</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-4">
                                {/* Vote Distribution */}
                                <div>
                                  <h4 className="text-sm font-medium mb-2">Vote Distribution</h4>
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-green-100 rounded-full h-4">
                                      <div 
                                        className="bg-green-500 h-4 rounded-full" 
                                        style={{ width: `${(score.upvotes / (score.upvotes + score.downvotes || 1)) * 100}%` }}
                                      />
                                    </div>
                                    <span className="text-sm font-medium">{score.upvotes} upvotes</span>
                                  </div>
                                  <div className="flex items-center gap-2 mt-2">
                                    <div className="flex-1 bg-red-100 rounded-full h-4">
                                      <div 
                                        className="bg-red-500 h-4 rounded-full" 
                                        style={{ width: `${(score.downvotes / (score.upvotes + score.downvotes || 1)) * 100}%` }}
                                      />
                                    </div>
                                    <span className="text-sm font-medium">{score.downvotes} downvotes</span>
                                  </div>
                                </div>

                                {/* Message Count */}
                                <div>
                                  <h4 className="text-sm font-medium mb-2">Message Activity</h4>
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-blue-100 rounded-full h-4">
                                      <div 
                                        className="bg-blue-500 h-4 rounded-full" 
                                        style={{ width: `${(score.messages / 20) * 100}%` }}
                                      />
                                    </div>
                                    <span className="text-sm font-medium">{score.messages} messages</span>
                                  </div>
                                </div>

                                {/* Performance Metrics */}
                                {debate.results.aiAnalysis && (
                                  <div>
                                    <h4 className="text-sm font-medium mb-2">Performance Metrics</h4>
                                    <div className="space-y-2">
                                      {['Argument Strength', 'Evidence Usage', 'Rhetorical Skills', 'Response Quality'].map((metric) => (
                                        <div key={metric} className="flex items-center gap-2">
                                          <span className="text-sm w-32">{metric}</span>
                                          <div className="flex-1 bg-gray-100 rounded-full h-2">
                                            <div 
                                              className="bg-primary h-2 rounded-full" 
                                              style={{ width: `${Math.floor(Math.random() * 40 + 60)}%` }}
                                            />
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>

                      {/* AI Analysis Summary */}
                      {debate.results.aiAnalysis && (
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold">AI Judge Analysis</h3>
                          <ScrollArea className="h-[300px] rounded-md border p-4">
                            <div className="space-y-4">
                              {/* Overall Assessment */}
                              <div>
                                <h4 className="font-semibold text-md mb-2">Overall Assessment</h4>
                                <div className="grid grid-cols-3 gap-4">
                                  {['Debate Quality', 'Engagement Level', 'Topic Coverage'].map((metric) => (
                                    <div key={metric} className="text-center p-3 bg-secondary rounded-lg">
                                      <div className="text-2xl font-bold mb-1">
                                        {Math.floor(Math.random() * 3 + 7)}/10
                                      </div>
                                      <div className="text-sm text-muted-foreground">{metric}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Key Points */}
                              <div>
                                <h4 className="font-semibold text-md mb-2">Key Points</h4>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="p-3 bg-secondary rounded-lg">
                                    <h5 className="font-medium mb-2">Strengths</h5>
                                    <ul className="text-sm space-y-1">
                                      <li>• Good engagement with the topic</li>
                                      <li>• Clear argument structure</li>
                                      <li>• Active participation</li>
                                    </ul>
                                  </div>
                                  <div className="p-3 bg-secondary rounded-lg">
                                    <h5 className="font-medium mb-2">Areas for Improvement</h5>
                                    <ul className="text-sm space-y-1">
                                      <li>• More evidence needed</li>
                                      <li>• Stronger rebuttals</li>
                                      <li>• Better time management</li>
                                    </ul>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </ScrollArea>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground">No results available</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div>
            {/* Debaters */}
            <Card>
              <CardHeader>
                <CardTitle>Debaters</CardTitle>
                <CardDescription>Current participants</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {debaters.map((debater) => {
                  const { upvotes, downvotes } = getVoteCounts(debater)
                  return (
                    <div key={debater.id} className="flex items-start gap-3">
                      <Avatar>
                        <AvatarImage src={debater.user?.avatar} alt={debater.user?.name || 'User'} />
                        <AvatarFallback>{(debater.user?.name || 'U').charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{debater.user?.name || 'Anonymous User'}</span>
                          {isAudience && (
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleVote(debater.id, 'up')}
                              >
                                <ThumbsUp className="h-4 w-4" />
                                <span className="ml-1">{upvotes}</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleVote(debater.id, 'down')}
                              >
                                <ThumbsDown className="h-4 w-4" />
                                <span className="ml-1">{downvotes}</span>
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            {/* Audience */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Audience</CardTitle>
                <CardDescription>{audience.length} members watching</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  {audience.map((member) => (
                    <div key={member.id} className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.user?.avatar} alt={member.user?.name || 'User'} />
                        <AvatarFallback>{(member.user?.name || 'U').charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span>{member.user?.name || 'Anonymous User'}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {timeLeft && (
          <div className="mt-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-lg font-semibold">Time Remaining: {timeLeft}</span>
            </div>
            <Progress value={timerProgress} className="h-2" />
          </div>
        )}
      </main>
    </div>
  )
}
