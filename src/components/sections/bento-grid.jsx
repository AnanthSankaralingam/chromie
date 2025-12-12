"use client";

import { motion } from "framer-motion";
import { Code, Terminal, Zap, Globe, Layout, Sparkles } from "lucide-react";

const features = [
     {
          title: "AI Code Generation",
          description: "Describe your extension in plain English. Our AI writes the manifest, background scripts, and UI components for you.",
          icon: Sparkles,
          className: "md:col-span-2",
          bg: "bg-primary/10",
          iconColor: "text-primary",
     },
     {
          title: "Browser Simulator",
          description: "Test your extension instantly in a sandboxed browser environment without leaving the app.",
          icon: Globe,
          className: "md:col-span-1",
          bg: "bg-blue-50",
          iconColor: "text-blue-600",
     },
     {
          title: "Live Preview",
          description: "See changes in real-time as you edit the code or prompt the AI.",
          icon: Layout,
          className: "md:col-span-1",
          bg: "bg-green-50",
          iconColor: "text-green-600",
     },
     {
          title: "One-Click Publish",
          description: "Package your extension and publish to the Chrome Web Store with a single click.",
          icon: Zap,
          className: "md:col-span-2",
          bg: "bg-purple-50",
          iconColor: "text-purple-600",
     },
];

export default function BentoGrid() {
     return (
          <section id="features" className="py-24 bg-background">
               <div className="container-width">
                    <div className="text-center mb-16">
                         <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything you need to build</h2>
                         <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                              From idea to published extension, Chromie handles the heavy lifting so you can focus on the product.
                         </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                         {features.map((feature, index) => (
                              <motion.div
                                   key={feature.title}
                                   initial={{ opacity: 0, y: 20 }}
                                   whileInView={{ opacity: 1, y: 0 }}
                                   viewport={{ once: true }}
                                   transition={{ delay: index * 0.1 }}
                                   className={`p-8 rounded-3xl border border-border/50 hover:shadow-lg transition-all duration-300 ${feature.className} ${feature.bg}`}
                              >
                                   <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 bg-card shadow-sm ${feature.iconColor}`}>
                                        <feature.icon className="w-6 h-6" />
                                   </div>
                                   <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                                   <p className="text-muted-foreground leading-relaxed">
                                        {feature.description}
                                   </p>
                              </motion.div>
                         ))}
                    </div>
               </div>
          </section>
     );
}
