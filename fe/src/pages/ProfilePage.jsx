"use client"

import { useState } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft, Edit, Save } from "lucide-react"

import { Button } from "../components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Textarea } from "../components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs"
import { Badge } from "../components/ui/badge"

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState("profile")
  const [userData, setUserData] = useState({
    id: 1,
    name: "Alex Johnson",
    email: "alex.johnson@example.com",
    bio: "Passionate about debating social and economic issues. I believe in evidence-based arguments and respectful discourse.",
    avatar: "/placeholder-user.jpg",
    isVerified: true,
    createdAt: "2023-01-15T10:30:00Z",
    debates: [
      {
        id: 1,
        topic: "Universal Basic Income: Solution or Problem?",
        role: "DEBATER",
        status: "ONGOING",
        createdAt: "2023-05-14T14:20:00Z",
      },
      {
        id: 2,
        topic: "Should AI Development Be Regulated?",
        role: "AUDIENCE",
        status: "WAITING",
        createdAt: "2023-05-15T10:30:00Z",
      },
      {
        id: 3,
        topic: "Climate Change: Individual vs Corporate Responsibility",
        role: "DEBATER",
        status: "FINISHED",
        createdAt: "2023-05-10T09:15:00Z",
      },
    ],
  })

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
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

  const handleSaveChanges = () => {
    // In a real app, you would send this to an API
    alert("Profile changes saved!")
    setIsEditing(false)
  }

  const handleInputChange = (e) => {
    const { id, value } = e.target
    setUserData((prev) => ({
      ...prev,
      [id]: value,
    }))
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
                        <AvatarImage src={userData.avatar || "/placeholder.svg"} alt={userData.name} />
                        <AvatarFallback>{userData.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      {isEditing && (
                        <Button variant="outline" size="sm" className="mt-2 sm:mt-0">
                          Change Avatar
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      {isEditing ? (
                        <Input id="name" value={userData.name} onChange={handleInputChange} />
                      ) : (
                        <p className="text-sm">{userData.name}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      {isEditing ? (
                        <Input id="email" value={userData.email} onChange={handleInputChange} />
                      ) : (
                        <p className="text-sm">{userData.email}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      {isEditing ? (
                        <Textarea
                          id="bio"
                          value={userData.bio}
                          onChange={handleInputChange}
                          className="min-h-[100px]"
                        />
                      ) : (
                        <p className="text-sm">{userData.bio}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Account Status</Label>
                      <div className="flex items-center gap-2">
                        <Badge variant={userData.isVerified ? "default" : "outline"}>
                          {userData.isVerified ? "Verified" : "Unverified"}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          Member since {formatDate(userData.createdAt)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    {isEditing && (
                      <div className="flex gap-2 ml-auto">
                        <Button variant="outline" onClick={() => setIsEditing(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleSaveChanges}>Save Changes</Button>
                      </div>
                    )}
                  </CardFooter>
                </Card>
              </TabsContent>

              <TabsContent value="debates" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>My Debates</CardTitle>
                    <CardDescription>Debates you've participated in</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {userData.debates.map((debate) => (
                        <div
                          key={debate.id}
                          className="flex flex-col sm:flex-row justify-between gap-2 border-b pb-4 last:border-0"
                        >
                          <div>
                            <Link to={`/debate/${debate.id}`} className="font-medium hover:underline">
                              {debate.topic}
                            </Link>
                            <div className="flex flex-wrap gap-2 mt-1">
                              <Badge variant="outline">{debate.role}</Badge>
                              {getStatusBadge(debate.status)}
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">{formatDate(debate.createdAt)}</div>
                        </div>
                      ))}
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
                <CardTitle>Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Debates:</span>
                  <span className="font-medium">{userData.debates.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">As Debater:</span>
                  <span className="font-medium">{userData.debates.filter((d) => d.role === "DEBATER").length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">As Audience:</span>
                  <span className="font-medium">{userData.debates.filter((d) => d.role === "AUDIENCE").length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Active Debates:</span>
                  <span className="font-medium">
                    {userData.debates.filter((d) => d.status === "ONGOING" || d.status === "WAITING").length}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  Change Password
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Notification Settings
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Privacy Settings
                </Button>
                <Button variant="outline" className="w-full justify-start text-destructive hover:text-destructive">
                  Delete Account
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
