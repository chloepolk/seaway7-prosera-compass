"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { SafeIcon } from "@/components/prosera-lib/safe-icon"

const CtaVendorRecommendation = () => {
  return (
    <div className="flex flex-row justify-center items-center gap-6 py-6">
      <div className="w-full max-w-7xl mx-auto flex flex-col justify-start items-center py-6">
        <Card className="w-full bg-secondary shadow-lg rounded-lg">
          <CardContent>
            <div className="flex flex-row justify-start items-center gap-16">
              <div className="flex flex-col justify-start items-start gap-2 flex-1">
                <h2 className="text-lg font-semibold leading-7 text-heading-foreground">
                  Vendor Recommendation Output
                </h2>
              </div>
              <div className="flex flex-row justify-start items-center gap-4">
                <h2 className="text-lg font-semibold leading-7 text-foreground">
                  Print File
                </h2>
                <div className="flex flex-row justify-start items-center gap-4 p-3 bg-primary text-primary-foreground rounded-lg size-12 hover:bg-primary/90 transition-colors">
                  <SafeIcon name="ChevronRight" className="size-6" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default CtaVendorRecommendation