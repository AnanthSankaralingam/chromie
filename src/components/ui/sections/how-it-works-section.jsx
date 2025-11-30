"use client"

import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import Image from "next/image"

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="relative z-10 px-6 pb-20">
      <div className="container mx-auto max-w-6xl">
        {/* Title */}
        {/* <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent leading-tight">
            about chromie
          </h2>
        </motion.div> */}

        {/* Workflow Steps */}
        {/* <div className="grid md:grid-cols-3 gap-8 md:gap-12 mb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex flex-col items-center text-center backdrop-blur-xl bg-slate-800/30 rounded-2xl p-8 md:p-10 border border-purple-500/30 min-h-[280px]"
          >
            <div className="flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full mb-6 md:mb-8 shadow-lg">
              <Edit3 className="w-8 h-8 md:w-10 md:h-10 text-white" />
            </div>
            <h3 className="text-xl md:text-2xl font-semibold text-gray-300 mb-3 md:mb-4">describe your chrome extension</h3>
            <p className="text-gray-300 text-base md:text-lg leading-relaxed">
              tell us what you want your extension to do in plain english. we'll do the rest.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col items-center text-center backdrop-blur-xl bg-slate-800/30 rounded-2xl p-8 md:p-10 border border-green-500/30 min-h-[280px]"
          >
            <div className="flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-green-500 to-teal-500 rounded-full mb-6 md:mb-8 shadow-lg">
              <Play className="w-8 h-8 md:w-10 md:h-10 text-white" />
            </div>
            <h3 className="text-xl md:text-2xl font-semibold text-gray-300 mb-3 md:mb-4">test within the app</h3>
            <p className="text-gray-300 text-base md:text-lg leading-relaxed">
              try your extension immediately in our simulated browser environment, testing all features and functionality in real-time.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col items-center text-center backdrop-blur-xl bg-slate-800/30 rounded-2xl p-8 md:p-10 border border-blue-500/30 min-h-[280px]"
          >
            <div className="flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-full mb-6 md:mb-8 shadow-lg">
              <Chrome className="w-8 h-8 md:w-10 md:h-10 text-white" />
            </div>
            <h3 className="text-xl md:text-2xl font-semibold text-gray-300 mb-3 md:mb-4">download or publish</h3>
            <p className="text-gray-300 text-base md:text-lg leading-relaxed">
              get your extension directly to the chrome web store or download the files for manual installation. one-click deployment makes sharing your creation simple and fast.
            </p>
          </motion.div>
        </div> */}

        {/* How-to: side-by-side steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-16"
        >
          <h3 className="text-2xl md:text-3xl font-semibold text-center mb-8 md:mb-12 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            how to use chromie
          </h3>

          {/* Step 1 */}
          <div className="grid md:grid-cols-2 gap-6 md:gap-8 items-center mb-8 md:mb-10">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="backdrop-blur-xl bg-slate-800/30 border border-slate-700/40 rounded-xl p-6"
            >
              <h4 className="text-xl md:text-2xl font-semibold text-gray-200 mb-2">describe your extension</h4>
              <p className="text-gray-300">tell chromie what you want in plain english. keep it simple and specific.</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="relative w-full h-48 md:h-64 lg:h-80 rounded-xl overflow-hidden bg-white/5 border border-white/10"
            >
              <Image
                src="/how-to-prompting.png"
                alt="describe your extension prompt"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
            </motion.div>
          </div>

          {/* Step 2 */}
          <div className="grid md:grid-cols-2 gap-6 md:gap-8 items-center mb-8 md:mb-10">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="backdrop-blur-xl bg-slate-800/30 border border-blue-500/20 rounded-xl p-6"
            >
              <h4 className="text-xl md:text-2xl font-semibold text-blue-200 mb-2">see the code in the editor</h4>
              <p className="text-gray-300">review the generated files in the in-app editor. adjust anything you need.</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="relative w-full h-48 md:h-64 lg:h-80 rounded-xl overflow-hidden bg-white/5 border border-white/10"
            >
              <Image
                src="/how-to-code-generated.png"
                alt="see generated code in the in-app editor"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
            </motion.div>
          </div>

          {/* Step 3 */}
          <div className="grid md:grid-cols-2 gap-6 md:gap-8 items-center mb-8 md:mb-10">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="backdrop-blur-xl bg-slate-800/30 border border-green-500/20 rounded-xl p-6"
            >
              <h4 className="text-xl md:text-2xl font-semibold text-green-200 mb-2">test in the browser simulator</h4>
              <p className="text-gray-300">run the extension instantly with the built-in test environment to verify behavior.</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="space-y-4"
            >
              <div className="relative w-full h-48 md:h-64 lg:h-80 rounded-xl overflow-hidden bg-white/5 border border-white/10">
                <Image
                  src="/how-to-testing.png"
                  alt="test the extension in the simulator"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover object-top"
                />
              </div>
              <div className="relative w-full h-48 md:h-64 lg:h-80 rounded-xl overflow-hidden bg-white/5 border border-white/10">
                <Image
                  src="/how-to-browser-simulator.png"
                  alt="browser simulator view"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-contain"
                />
              </div>
            </motion.div>
          </div>

          {/* Step 4 */}
          <div className="grid md:grid-cols-2 gap-6 md:gap-8 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="backdrop-blur-xl bg-slate-800/30 border border-slate-500/20 rounded-xl p-6"
            >
              <h4 className="text-xl md:text-2xl font-semibold text-slate-200 mb-2">download the zip</h4>
              <p className="text-gray-300">grab a zip with all the code to run locally or publish to the chrome web store.</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="relative w-full h-48 md:h-64 lg:h-80 rounded-xl overflow-hidden bg-white/5 border border-white/10"
            >
              <Image
                src="/how-to-downloading.png"
                alt="download the zip with your code"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover object-top"
              />
            </motion.div>
          </div>
        </motion.div>

        {/* Call to action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <Button
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            className="bg-gradient-to-r from-purple-600 via-purple-500 to-blue-600 hover:from-purple-500 hover:via-purple-400 hover:to-blue-500 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/40 transition-all duration-300 px-8 py-3 text-lg"
          >
            start building your extension
          </Button>
        </motion.div>
      </div>
    </section>
  )
}
