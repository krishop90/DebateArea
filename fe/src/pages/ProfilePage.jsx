"use client"

import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ArrowLeft, Edit, Save } from "lucide-react"
import { useAuth } from "../lib/auth-context"
import { auth, debates } from "../lib/api"
import { Button } from "../components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Textarea } from "../components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs"
import { Badge } from "../components/ui/badge"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../components/ui/alert-dialog"
import { toast } from "sonner"

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, logout, updateProfile } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState("profile")
  const [loading, setLoading] = useState(false)
  const [debates, setDebates] = useState([])
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    bio: user?.bio || "",
  })

  useEffect(() => {
    const fetchDebates = async () => {
      try {
        const response = await debates.getMyDebates()
        setDebates(response.data.debates)
      } catch (error) {
        console.error('Error fetching debates:', error)
      }
    }
    fetchDebates()
  }, [])

  const handleInputChange = (e) => {
    const { id, value } = e.target
    setFormData(prev => ({
      ...prev,
      [id]: value,
    }))
  }

  const handleSaveChanges = async () => {
    try {
      setLoading(true)
      await updateProfile(formData)
      toast.success("Profile updated successfully")
      setIsEditing(false)
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update profile")
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate("/")
    toast.success("Logged out successfully")
  }

  const handleDeleteAccount = async () => {
    try {
      setLoading(true)
      await auth.deleteAccount()
      logout()
      navigate("/")
      toast.success("Account deleted successfully")
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete account")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Profile Info */}
          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="debates">My Debates</TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="mt-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Profile Information</CardTitle>
                      <CardDescription>Manage your personal information</CardDescription>
                    </div>
                    <Button variant="outline" size="icon" onClick={() => setIsEditing(!isEditing)}>
                      {isEditing ? <Save className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-col items-center sm:flex-row sm:gap-4">
                      <Avatar className="h-24 w-24">
                        <AvatarImage src={user?.avatar || "/placeholder.svg"} alt={user?.name} />
                        <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      {isEditing ? (
                        <Input id="name" value={formData.name} onChange={handleInputChange} />
                      ) : (
                        <p className="text-sm">{formData.name}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      {isEditing ? (
                        <Input id="email" value={formData.email} onChange={handleInputChange} />
                      ) : (
                        <p className="text-sm">{formData.email}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      {isEditing ? (
                        <Textarea
                          id="bio"
                          value={formData.bio}
                          onChange={handleInputChange}
                          className="min-h-[100px]"
                        />
                      ) : (
                        <p className="text-sm">{formData.bio}</p>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter>
                    {isEditing && (
                      <div className="flex gap-2 ml-auto">
                        <Button variant="outline" onClick={() => setIsEditing(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleSaveChanges} disabled={loading}>
                          {loading ? "Saving..." : "Save Changes"}
                        </Button>
                      </div>
                    )}
                  </CardFooter>
                </Card>
              </TabsContent>

              <TabsContent value="debates" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>My Debates</CardTitle>
                    <CardDescription>Debates you've participated in as a debater</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {debates.length === 0 ? (
                        <p className="text-center text-muted-foreground">No debates found</p>
                      ) : (
                        debates.map((debate) => {
                          const participant = debate.participants.find(p => p.userId === user.id);
                          const isWinner = debate.results?.winnerId === user.id;
                          const { upvotes, downvotes } = participant ? {
                            upvotes: participant.votesReceived?.filter(v => v.value === 1).length || 0,
                            downvotes: participant.votesReceived?.filter(v => v.value === -1).length || 0
                          } : { upvotes: 0, downvotes: 0 };

                          return (
                            <Card key={debate.id} className="hover:shadow-lg transition-shadow">
                              <CardHeader>
                                <div className="flex justify-between items-start">
                                  <div>
                                    <CardTitle className="text-lg">{debate.topic}</CardTitle>
                                    <CardDescription>
                                      {new Date(debate.createdAt).toLocaleDateString()}
                                    </CardDescription>
                                  </div>
                                  <div className="flex flex-col items-end gap-2">
                                    <Badge variant={isWinner ? "success" : "destructive"}>
                                      {isWinner ? "Won" : "Lost"}
                                    </Badge>
                                    <Badge variant="outline">
                                      {debate.status}
                                    </Badge>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent>
                                <div className="grid grid-cols-3 gap-4">
                                  <div className="text-center p-3 bg-secondary rounded-lg">
                                    <div className="text-2xl font-bold mb-1">
                                      {upvotes - downvotes}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      Net Votes
                                    </div>
                                  </div>
                                  <div className="text-center p-3 bg-secondary rounded-lg">
                                    <div className="text-2xl font-bold mb-1">
                                      {upvotes}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      Upvotes
                                    </div>
                                  </div>
                                  <div className="text-center p-3 bg-secondary rounded-lg">
                                    <div className="text-2xl font-bold mb-1">
                                      {downvotes}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      Downvotes
                                    </div>
                                  </div>
                                </div>
                                {debate.results?.aiAnalysis?.overallAssessment && (
                                  <div className="mt-4">
                                    <h4 className="text-sm font-medium mb-2">Overall Assessment</h4>
                                    <div className="grid grid-cols-3 gap-4">
                                      {Object.entries(debate.results.aiAnalysis.overallAssessment).map(([key, value]) => (
                                        <div key={key} className="text-center p-3 bg-secondary rounded-lg">
                                          <div className="text-2xl font-bold mb-1">
                                            {value}/10
                                          </div>
                                          <div className="text-sm text-muted-foreground">
                                            {key.replace(/([A-Z])/g, ' $1').trim()}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                <div className="mt-4">
                                  <Button variant="outline" className="w-full" asChild>
                                    <Link to={`/debate/${debate.id}`}>View Debate</Link>
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full justify-start">
                      Delete Account
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your account
                        and remove all your data from our servers.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteAccount} disabled={loading}>
                        {loading ? "Deleting..." : "Delete Account"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
