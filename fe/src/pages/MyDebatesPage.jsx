import { useState, useEffect } from "react";
import { useAuth } from "../lib/auth-context";
import { debates } from "../lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { useNavigate } from "react-router-dom";

export default function MyDebatesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [myDebates, setMyDebates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("created");

  useEffect(() => {
    fetchMyDebates();
  }, [activeTab]);

  const fetchMyDebates = async () => {
    try {
      setLoading(true);
      const response = await debates.getAll({
        [activeTab === "created" ? "creatorId" : "participantId"]: user.id,
      });
      setMyDebates(response.data.debates);
    } catch (error) {
      console.error("Error fetching debates:", error);
    } finally {
      setLoading(false);
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

  const getPerformanceStats = (debate) => {
    const participant = debate.participants.find(p => p.userId === user.id);
    if (!participant) return null;

    const totalVotes = debate.participants.reduce((sum, p) => sum + p.votes.length, 0);
    const myVotes = participant.votes.length;
    const winRate = totalVotes > 0 ? (myVotes / totalVotes) * 100 : 0;

    return (
      <div className="mt-2 space-y-1">
        <p className="text-sm">Votes Received: {myVotes}</p>
        <p className="text-sm">Win Rate: {winRate.toFixed(1)}%</p>
      </div>
    );
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">My Debates</h1>
      
      <Tabs defaultValue="created" onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="created">Created Debates</TabsTrigger>
          <TabsTrigger value="participated">Participated Debates</TabsTrigger>
        </TabsList>

        <TabsContent value="created">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {myDebates.map((debate) => (
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
                    <p className="text-sm text-muted-foreground">
                      Created: {new Date(debate.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Participants: {debate.participants.length}
                    </p>
                    {debate.status === "FINISHED" && getPerformanceStats(debate)}
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => navigate(`/debate/${debate.id}`)}
                    >
                      View Debate
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="participated">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {myDebates.map((debate) => (
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
                    <p className="text-sm text-muted-foreground">
                      Joined: {new Date(debate.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Role: {debate.participants.find(p => p.userId === user.id)?.role}
                    </p>
                    {debate.status === "FINISHED" && getPerformanceStats(debate)}
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => navigate(`/debate/${debate.id}`)}
                    >
                      View Debate
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 