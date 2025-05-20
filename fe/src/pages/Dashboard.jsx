"use client"

import { useState } from "react"
import { Link } from "react-router-dom"
import { Plus, Search, Filter, ChevronDown } from "lucide-react"

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
} from "../components/ui/dialog"
import { Label } from "../components/ui/label"
import { Textarea } from "../components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select"

// Mock data based on the schema
const debates = [
  {
    id: 1,
    topic: "Should AI Development Be Regulated?",
    description:
      "Discussing the ethical implications and potential regulations for artificial intelligence development.",
    status: "WAITING",
    category: "Technology",
    participants: [{ id: 1, userId: 1, role: "DEBATER", position: "For regulation" }],
    createdAt: "2023-05-15T10:30:00Z",
  },
  {
    id: 2,
    topic: "Universal Basic Income: Solution or Problem?",
    description: "Examining the economic and social impacts of implementing a universal basic income system.",
    status: "ONGOING",
    category: "Economics",
    participants: [
      { id: 2, userId: 2, role: "DEBATER", position: "UBI is necessary" },
      { id: 3, userId: 3, role: "DEBATER", position: "UBI is unsustainable" },
      { id: 4, userId: 4, role: "AUDIENCE" },
      { id: 5, userId: 5, role: "AUDIENCE" },
    ],
    createdAt: "2023-05-14T14:20:00Z",
  },
  {
    id: 3,
    topic: "Climate Change: Individual vs Corporate Responsibility",
    description:
      "Debating whether the burden of addressing climate change should fall more on individuals or corporations.",
    status: "FINISHED",
    category: "Environment",
    participants: [
      { id: 6, userId: 6, role: "DEBATER", position: "Corporate responsibility" },
      { id: 7, userId: 7, role: "DEBATER", position: "Individual action" },
      { id: 8, userId: 8, role: "AUDIENCE" },
      { id: 9, userId: 9, role: "AUDIENCE" },
      { id: 10, userId: 10, role: "AUDIENCE" },
    ],
    createdAt: "2023-05-10T09:15:00Z",
  },
  {
    id: 4,
    topic: "Is Social Media Harmful to Society?",
    description: "Exploring the positive and negative impacts of social media on individuals and communities.",
    status: "WAITING",
    category: "Society",
    participants: [{ id: 11, userId: 11, role: "DEBATER", position: "Social media is harmful" }],
    createdAt: "2023-05-16T16:45:00Z",
  },
]

const categories = [
  { id: 1, name: "Technology" },
  { id: 2, name: "Economics" },
  { id: 3, name: "Environment" },
  { id: 4, name: "Society" },
  { id: 5, name: "Politics" },
  { id: 6, name: "Education" },
  { id: 7, name: "Health" },
]

export default function Dashboard() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [categoryFilter, setCategoryFilter] = useState("ALL")

  // Filter debates based on search query and filters
  const filteredDebates = debates.filter((debate) => {
    const matchesSearch =
      debate.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (debate.description && debate.description.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesStatus = statusFilter === "ALL" || debate.status === statusFilter
    const matchesCategory = categoryFilter === "ALL" || debate.category === categoryFilter

    return matchesSearch && matchesStatus && matchesCategory
  })

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

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">DebateArea</h1>
          </div>
          <div className="flex items-center gap-4">
            <Button onClick={() => setIsCreateDialogOpen(true)} className="hidden sm:flex">
              <Plus className="mr-2 h-4 w-4" /> Create Debate
            </Button>
            <Button onClick={() => setIsCreateDialogOpen(true)} size="icon" className="sm:hidden">
              <Plus className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="/placeholder-user.jpg" alt="User" />
                    <AvatarFallback>U</AvatarFallback>
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
                  <Link to="/my-debates" className="w-full">
                    My Debates
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link to="/settings" className="w-full">
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link to="/logout" className="w-full">
                    Logout
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-6">
        {/* Search and Filters */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search debates..."
              className="w-full pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  <Filter className="mr-2 h-4 w-4" />
                  Status
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setStatusFilter("ALL")}>All</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("WAITING")}>Waiting</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("ONGOING")}>Ongoing</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("FINISHED")}>Finished</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  <Filter className="mr-2 h-4 w-4" />
                  Category
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setCategoryFilter("ALL")}>All Categories</DropdownMenuItem>
                {categories.map((category) => (
                  <DropdownMenuItem key={category.id} onClick={() => setCategoryFilter(category.name)}>
                    {category.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Debates Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDebates.map((debate) => (
            <Card key={debate.id} className="flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="line-clamp-1">{debate.topic}</CardTitle>
                    <CardDescription className="mt-1">{formatDate(debate.createdAt)}</CardDescription>
                  </div>
                  {getStatusBadge(debate.status)}
                </div>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground line-clamp-3">{debate.description}</p>
                <div className="mt-4">
                  <Badge variant="outline" className="mr-2">
                    {debate.category}
                  </Badge>
                  <Badge variant="outline">{debate.participants.length} participants</Badge>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <div className="flex -space-x-2">
                  {debate.participants.slice(0, 3).map((participant, index) => (
                    <Avatar key={participant.id} className="border-2 border-background h-8 w-8">
                      <AvatarFallback>{`U${index + 1}`}</AvatarFallback>
                    </Avatar>
                  ))}
                  {debate.participants.length > 3 && (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-medium">
                      +{debate.participants.length - 3}
                    </div>
                  )}
                </div>
                <Link to={`/debate/${debate.id}`}>
                  <Button
                    variant={
                      debate.status === "WAITING" && debate.participants.filter((p) => p.role === "DEBATER").length < 2
                        ? "default"
                        : "secondary"
                    }
                    disabled={
                      debate.status !== "WAITING" || debate.participants.filter((p) => p.role === "DEBATER").length >= 2
                    }
                  >
                    {debate.status === "WAITING" && debate.participants.filter((p) => p.role === "DEBATER").length < 2
                      ? "Join as Debater"
                      : debate.status === "WAITING" || debate.status === "ONGOING"
                        ? "Join as Audience"
                        : "View Results"}
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Create Debate Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create a New Debate</DialogTitle>
              <DialogDescription>
                Start a new debate by providing a topic and description. Others can join as debaters or audience.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="topic">Topic</Label>
                <Input id="topic" placeholder="Enter the debate topic" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.name}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Provide details about the debate topic..."
                  className="min-h-[100px]"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="position">Your Position</Label>
                <Textarea
                  id="position"
                  placeholder="Briefly state your position on this topic..."
                  className="min-h-[80px]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Debate</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
