import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth-context";
import { useSocket } from "../lib/socket-context";
import { debates } from "../lib/api";
import { toast } from "sonner";
import { Users, Clock } from "lucide-react";

import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Filter } from "lucide-react";

export default function MyDebatesPage() {
  const { user } = useAuth();
  const socket = useSocket();
  const [debatesList, setDebatesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    fetchMyDebates();

    socket.on('debateStatusUpdated', ({ debateId, status, debate }) => {
      setDebatesList(prev => prev.map(d => d.id === debateId ? debate : d));
      toast.info(`Debate status updated to ${status.toLowerCase()}`);
    });

    socket.on('participantJoined', ({ debateId, participant }) => {
      setDebatesList(prev => prev.map(debate => {
        if (debate.id === debateId) {
          return {
            ...debate,
            participants: [...debate.participants, participant]
          };
        }
        return debate;
      }));
    });

    return () => {
      socket.off('debateStatusUpdated');
      socket.off('participantJoined');
    };
  }, [socket]);

  const fetchMyDebates = async () => {
    try {
      setLoading(true);
      const response = await debates.getMyDebates({
        search: searchQuery,
        status: statusFilter
      });
      setDebatesList(response.data.debates);
    } catch (error) {
      toast.error('Failed to fetch your debates');
    } finally {
      setLoading(false);
    }
  };

  const handleStartDebate = async (debateId) => {
    try {
      const response = await debates.updateStatus(debateId, 'ONGOING');
      setDebatesList(prev => prev.map(d => d.id === debateId ? response.data.debate : d));
      toast.success('Debate started');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to start debate');
    }
  };

  const handleEndDebate = async (debateId) => {
    try {
      const response = await debates.updateStatus(debateId, 'FINISHED');
      setDebatesList(prev => prev.map(d => d.id === debateId ? response.data.debate : d));
      toast.success('Debate ended');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to end debate');
    }
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      WAITING: "bg-yellow-500",
      ONGOING: "bg-blue-500",
      FINISHED: "bg-green-500",
    };
    return (
      <Badge className={statusColors[status]}>
        {status.charAt(0) + status.slice(1).toLowerCase()}
      </Badge>
    );
  };

  const getParticipantCounts = (participants) => {
    const debaters = participants.filter(p => p.role === 'DEBATER').length;
    const audience = participants.filter(p => p.role === 'AUDIENCE').length;
    return { debaters, audience };
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">My Debates</h1>
          <Button asChild>
            <Link to="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center gap-2">
            <Input
              placeholder="Search debates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setStatusFilter("")}>
                  All Status
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("WAITING")}>
                  Waiting
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("ONGOING")}>
                  Ongoing
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("FINISHED")}>
                  Finished
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Debates Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <div className="col-span-full text-center">Loading debates...</div>
          ) : debatesList.length === 0 ? (
            <div className="col-span-full text-center">No debates found</div>
          ) : (
            debatesList.map((debate) => {
              const { debaters, audience } = getParticipantCounts(debate.participants);
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
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          asChild
                        >
                          <Link to={`/debate/${debate.id}`}>View Debate</Link>
                        </Button>
                        {debate.status === 'WAITING' && debaters >= 2 && (
                          <Button
                            className="flex-1"
                            onClick={() => handleStartDebate(debate.id)}
                          >
                            Start Debate
                          </Button>
                        )}
                        {debate.status === 'ONGOING' && (
                          <Button
                            variant="destructive"
                            className="flex-1"
                            onClick={() => handleEndDebate(debate.id)}
                          >
                            End Debate
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
} 