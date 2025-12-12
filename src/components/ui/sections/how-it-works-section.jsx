"use client"

import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

export default function HowItWorksSection() {
  const steps = [
    {
      title: "Describe your extension",
      description: "Tell Chromie what you want in plain English. Keep it simple and specific.",
      video: "/HIW - 1.mov",
      color: "bg-blue-50/10 border-blue-100/20 text-blue-100",
    },
    {
      title: "Interact with Chromie Agent",
      description: "Work with the Chromie agent to refine and customize your extension through conversation.",
      video: "/HIW - 2.mov",
      color: "bg-blue-50 border-blue-100 text-blue-900",
    },
    {
      title: "See the code in the editor",
      description: "Review the generated files in the in-app editor. Adjust anything you need.",
      video: "/HIW - 3.mov",
      color: "bg-purple-50 border-purple-100 text-purple-900",
    },
    {
      title: "Test in the browser simulator",
      description: "Run the extension instantly with the built-in test environment to verify behavior.",
      video: "/HIW - 4.mov",
      color: "bg-green-50 border-green-100 text-green-900",
    },
    {
      title: "Share your creation",
      description: "Share your extension with others or download the zip to publish to the Chrome Web Store.",
      video: "/HIW - 5.mov",
      color: "bg-slate-50 border-slate-100 text-slate-900",
    },
  ]

  return (
    <section id="how-it-works" className="py-24 bg-background relative z-10">
      <div className="container-width">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
            How it works
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Go from idea to published extension in five simple steps.
          </p>
        </motion.div>

        <div className="space-y-24">
          {steps.map((step, index) => (
            <div key={index} className="grid md:grid-cols-2 gap-8 md:gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className={cn(
                  "relative rounded-3xl overflow-hidden shadow-2xl border border-border/50 aspect-video bg-slate-100",
                  index % 2 === 1 && "md:order-2"
                )}
              >
                <video
                  src={step.video}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: index % 2 === 0 ? 20 : -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className={cn(
                  "flex flex-col justify-center",
                  index % 2 === 1 && "md:order-1"
                )}
              >
                <div className={cn("inline-flex self-start px-3 py-1 rounded-full text-xs font-semibold mb-4", step.color)}>
                  Step {index + 1}
                </div>
                <h3 className="text-2xl md:text-3xl font-bold mb-4 text-foreground">{step.title}</h3>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </motion.div>
            </div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mt-24"
        >
          <Button
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            className="btn-primary px-8 py-6 text-lg rounded-full shadow-xl shadow-primary/20 hover:shadow-primary/30 hover:scale-105 transition-all"
          >
            Start Building Now
          </Button>
        </motion.div>
      </div>
    </section>
  )
}
