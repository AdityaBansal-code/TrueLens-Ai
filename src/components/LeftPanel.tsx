import { ArrowRight, Shield, Upload, Cpu, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import GoogleShield from "./ui/GoogleShield";


const steps = [
  {
    id: 1,
    icon: Upload,
    title: "Submit Content",
    description:
      "Upload text, images, or voice messages for verification",
    color: "google-blue",
  },
  {
    id: 2,
    icon: Cpu,
    title: "AI Analysis",
    description:
      "Our advanced AI analyzes content using multiple verification models",
    color: "google-red",
  },
  {
    id: 3,
    icon: CheckCircle2,
    title: "Get Results",
    description:
      "Receive detailed fact-checking results with confidence scores",
    color: "google-green",
  },
];

// ✅ Color mapping (fixes dynamic Tailwind issue)
const colorClasses: Record<string, string> = {
  "google-blue": "bg-google-blue",
  "google-red": "bg-google-red",
  "google-green": "bg-google-green",
};

// Card animation variants
const cardVariants = {
  offscreen: { opacity: 0, y: 30 },
  onscreen: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      bounce: 0.15,
      duration: 0.6,
      delay: i * 0.2,
      ease: "easeInOut" as const,
    },
  }),
};

// Hover effect for icons
const iconHover = {
  scale: 1.12,
  transition: {
    type: "spring" as const,
    stiffness: 300,
    damping: 20,
  },
};

const LeftPanel = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col w-full space-y-7 ">
      {/* Hero Section */}
      <section className="relative min-h-[40vh] flex items-center justify-center overflow-hidden bg-gradient-hero rounded-xl pt-5">
        <div className="absolute inset-0 opacity-5">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.5'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          ></div>
        </div>

        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex justify-center relative">
              {/* Cycling Glow */}
              <div className="absolute z-0 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="w-40 h-40 rounded-full blur-[70px] animate-glow-cycle"></div>
              </div>

              {/* Shield Icon */}
              <div className="relative z-10 p-2">
                <GoogleShield className="h-20 w-20 drop-shadow-lg" />

              </div>
            </div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
              className="text-4xl md:text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent"
            >
              TrueLens
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3, ease: "easeInOut" }}
              className="text-lg md:text-xl text-muted-foreground"
            >
              AI-powered tool to detect misinformation and educate digital
              citizens.
            </motion.p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 justify-center pt-2 pb-4"
            >
              {/* Primary CTA */}
              <Button
                size="lg"
                onClick={() => navigate("/chat")}
                className="bg-google-blue hover:opacity-90 text-white border-0 shadow-glow hover:shadow-xl transition-all duration-base group"
              >
                Verify News with AI
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>

              
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section
        id="how-it-works"
        className="bg-background flex items-center py-4 rounded-xl"
      >
        <div className="container mx-auto px-4">
          <div className="text-center mb-10 space-y-2">
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
              className="text-2xl md:text-3xl font-bold"
            >
              How TrueLens Works
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.6, ease: "easeInOut" }}
              className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto"
            >
              Our AI-powered verification process helps you identify
              misinformation in seconds
            </motion.p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <motion.section
                  key={step.id}
                  className="relative"
                  initial="offscreen"
                  whileInView="onscreen"
                  viewport={{ once: true, amount: 0.5 }}
                  custom={index}
                  variants={cardVariants}
                  aria-label={`Step ${index + 1}: ${step.title}`}
                  tabIndex={0}
                >
                  <div className="bg-gradient-card rounded-xl p-6 shadow-md hover:shadow-xl transition-all duration-base border border-border space-y-3 focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 relative">
                    {/* Icon */}
                    <motion.div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        colorClasses[step.color]
                      }`}
                      whileHover={iconHover}
                      whileFocus={iconHover}
                    >
                      <Icon className="h-6 w-6 text-white" />
                    </motion.div>

                    {/* Step number with yellow glow */}
                    <div className="absolute -top-3 -right-3 flex items-center justify-center">
                     
                     
                    </div>

                    <h3 className="text-base md:text-lg font-semibold">
                      {step.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </motion.section>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};

export default LeftPanel;
