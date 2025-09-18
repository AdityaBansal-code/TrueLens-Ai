import { useEffect, useState, useRef } from "react";
import { CheckCircle, XCircle, TrendingUp, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  status: "true" | "false" | "mixed";
  rank: number;
  confidence: number;
  source?: string;
  date?: string;
}

// Refactored StatusBadge component with improved hover effects
const STATUS_VARIANTS = {
  true: {
    className: "bg-[#DFF5E3] text-[#0F9D58] hover:bg-[#C8EACD] hover:text-[#0B7D46]",
    Icon: CheckCircle,
  }, // Softer Green with hover
  false: {
    className: "bg-[#FDECEA] text-[#D93025] hover:bg-[#F9D7D3] hover:text-[#B7211C]",
    Icon: XCircle,
  }, // Softer Red with hover
  mixed: {
    className: "bg-[#FFF4E5] text-[#F4B400] hover:bg-[#FDE9C7] hover:text-[#DFA200]",
    Icon: AlertTriangle,
  }, // Softer Yellow with hover
};

function StatusBadge({ status, confidence }: Readonly<{ status: NewsItem["status"]; confidence: number }>) {
  const { className, Icon } = STATUS_VARIANTS[status];
  return (
    <Badge className={`gap-1 text-xs ${className}`}>
      <Icon className="h-4 w-4" />
      <span className="capitalize">{status}</span>
      <span className="opacity-75">({confidence}%)</span>
    </Badge>
  );
}


const Leaderboard = () => {
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const mockData: NewsItem[] = [
      {
        id: "1",
        title: "New AI Breakthrough Achieves 99% Accuracy",
        summary: "Research team announces revolutionary AI model for scientific discovery",
        status: "true",
        rank: 1,
        confidence: 92,
        source: "TechNews",
        date: "2024-01-15",
      },
      {
        id: "2",
        title: "Celebrity Endorses Miracle Weight Loss Product",
        summary: "Famous actor claims product helped lose 50 pounds in 2 weeks",
        status: "false",
        rank: 2,
        confidence: 88,
        source: "ViralBuzz",
        date: "2024-01-14",
      },
      {
        id: "3",
        title: "Climate Report Shows Mixed Progress",
        summary: "Latest environmental study reveals both improvements and concerns",
        status: "mixed",
        rank: 3,
        confidence: 75,
        source: "ScienceDaily",
        date: "2024-01-13",
      },
      {
        id: "4",
        title: "New Vaccine Shows Promise in Trials",
        summary: "Phase 3 trials demonstrate 85% effectiveness against new variant",
        status: "true",
        rank: 4,
        confidence: 94,
        source: "MedicalJournal",
        date: "2024-01-12",
      },
      {
        id: "5",
        title: "Ancient Civilization Found Under Ocean",
        summary: "Archaeologists claim discovery of Atlantis with advanced technology",
        status: "false",
        rank: 5,
        confidence: 96,
        source: "ConspiracyNet",
        date: "2024-01-11",
      },
      {
        id: "6",
        title: "Economic Growth Exceeds Predictions",
        summary: "Q4 reports show stronger than expected market performance",
        status: "true",
        rank: 6,
        confidence: 87,
        source: "FinanceToday",
        date: "2024-01-10",
      },
      {
        id: "7",
        title: "Alien Contact Confirmed by Government",
        summary: "Officials allegedly reveal decades of extraterrestrial communication",
        status: "false",
        rank: 7,
        confidence: 99,
        source: "TruthSeeker",
        date: "2024-01-09",
      },
    ];

    setTimeout(() => {
      setNewsItems([...mockData, ...mockData]); // Duplicate for seamless scroll
      setLoading(false);
    }, 1000);
  }, []);

  // Seamless scroll logic
  useEffect(() => {
    if (!loading && scrollRef.current) {
      const container = scrollRef.current;
      let scrollY = 0;

      const animate = () => {
        scrollY += 0.6;
        if (container) {
          container.scrollTop = scrollY;
          if (scrollY >= container.scrollHeight / 2) {
            scrollY = 0;
          }
        }
        animationRef.current = requestAnimationFrame(animate);
      };

      animationRef.current = requestAnimationFrame(animate);

      const pause = () => animationRef.current && cancelAnimationFrame(animationRef.current);
      const resume = () => (animationRef.current = requestAnimationFrame(animate));

      container.addEventListener("mouseenter", pause);
      container.addEventListener("mouseleave", resume);

      return () => {
        pause();
        container.removeEventListener("mouseenter", pause);
        container.removeEventListener("mouseleave", resume);
      };
    }
  }, [loading]);

  return (
    <section id="leaderboard" className="h-full bg-gradient-hero flex flex-col">
      <motion.div
        className="container mx-auto px-4 sm:px-2 h-full flex flex-col"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="text-center mb-4 pt-4">
          <motion.div
            className="flex items-center justify-center gap-2 mb-2"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <TrendingUp className="h-6 w-6 text-primary" />
            <h2 className="text-xl sm:text-lg md:text-2xl font-bold">Top Flagged News</h2>
          </motion.div>
          <p className="text-sm text-muted-foreground">
            Most analyzed news items by our community
          </p>
        </div>

        {/* Content */}
        <motion.div
          className="flex-1 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent"></div>
              <p className="mt-3 text-sm text-muted-foreground">Loading leaderboard...</p>
            </div>
          ) : (
            <motion.div
              ref={scrollRef}
              aria-label="News leaderboard scroll area"
              className="h-full overflow-y-hidden pr-2 [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              initial={{ y: 20 }}
              animate={{ y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="space-y-3">
                {newsItems.map((item, index) => (
                  <motion.div
                    key={`${item.id}-${index}`}
                    className="p-4 hover:shadow-lg transition-all duration-base border-border bg-card"
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${getRankClass(item.rank)}`}
                        >
                          #{item.rank}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="text-sm font-semibold line-clamp-1">{item.title}</h3>
                          <StatusBadge status={item.status} confidence={item.confidence} />
                        </div>

                        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                          {item.summary}
                        </p>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          {item.source && (
                            <span className="flex items-center gap-1">
                              <span className="font-medium">Source:</span> {item.source}
                            </span>
                          )}
                          {item.date && (
                            <span className="flex items-center gap-1">
                              <span className="font-medium">Date:</span>{" "}
                              {new Date(item.date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </section>
  );
};

export default Leaderboard;


  function getRankClass(rank: number): string {
  if (rank === 1) return "bg-gradient-to-r from-[#4285F4] to-[#1A73E8] text-white"; // Google Blue
  if (rank === 2) return "bg-[#DFF5E3] text-[#0F9D58]"; // Softer Green
  if (rank === 3) return "bg-[#FFF4E5] text-[#F4B400]"; // Softer Yellow
  return "bg-[#F1F3F4] text-[#5F6368]"; // Neutral Gray
}


