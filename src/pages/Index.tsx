
import LeftPanel from "@/components/LeftPanel";
import Leaderboard from "@/components/Leaderboard";


const Index = () => {
  return (
    <div className="h-screen bg-background flex flex-col">
      
      
      <main className="flex-1 pt-2 grid lg:grid-cols-[2fr_1fr] overflow-hidden">
        {/* Left Panel */}
        <div className=" px-8 pb-8 space-y-8 w-full">
          <LeftPanel />
        </div>

        {/* Leaderboard */}
        <div className="overflow-y-auto border-l border-border px-4 pb-8">
          <Leaderboard />
        </div>
      </main>
    </div>
  );
};

export default Index;