"use client"

import { useState, useEffect } from "react"
import { SafeIcon } from "@/components/prosera-lib/safe-icon"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"

// ShadCN Studio Components
import TypeLineChartCustomLabel from "@/components/shadcn-studio/blocks/typeline-chart-custom-label"
import TypeLineChartInventorySingle from "@/components/shadcn-studio/blocks/typeline-chart-inventory-single"
import TypeLineChartInventoryStacked from "@/components/shadcn-studio/blocks/typeline-chart-inventory-stacked"
import TypeLineChartInventoryPanzoom from "@/components/shadcn-studio/blocks/typeline-chart-inventory-panzoom"
import TypeBarChart from "@/components/shadcn-studio/blocks/typebar-chart"
import TypeBarChartMultiple from "@/components/shadcn-studio/blocks/typebar-chart-multiple"
import ButtonGroupNumberDemo from "@/components/shadcn-studio/button-group/button-group-07"
import ButtonGroup12 from "@/components/shadcn-studio/button-group/button-group-12"
import DataTable11 from "@/components/shadcn-studio/data-table/data-table-11"
import SearchDialog from "@/components/shadcn-studio/blocks/dialog-search"
import LanguageDropdown from "@/components/shadcn-studio/blocks/dropdown-language"
import NotificationDropdown from "@/components/shadcn-studio/blocks/dropdown-notification"
import ProfileDropdown from "@/components/shadcn-studio/blocks/dropdown-profile"
import ActivityDialog from "@/components/shadcn-studio/blocks/dialog-activity"
import DatePicker02 from "@/components/shadcn-studio/date-picker/date-picker-02"
import ServiceLevelTableStats from "@/components/shadcn-studio/blocks/service-level-table-stats"
import CtaVendorRecommendation from "@/components/shadcn-studio/blocks/cta-vendor-recommendation"

import { cn } from "@/lib/utils"

interface ComponentSectionProps {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}

function ComponentSection({ title, description, children, className }: ComponentSectionProps) {
  return (
    <section className={cn("space-y-6", className)}>
      <div>
        <h2 className="text-2xl font-semibold mb-2">{title}</h2>
        {description && (
          <p className="text-muted-foreground text-sm">{description}</p>
        )}
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {children}
      </div>
    </section>
  )
}

function ComponentCard({ title, description, children, className }: { title: string; description?: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="w-full" style={{ width: '100%', minWidth: 0 }}>
        <div className="flex items-center justify-center min-h-[100px] w-full" style={{ width: '100%', minWidth: 0 }}>
          {children}
        </div>
      </CardContent>
    </Card>
  )
}

export function User00ComponentShowcase() {
  const [progress, setProgress] = useState(33)

  return (
    <div className="space-y-12 pb-12">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold">Component Library Showcase</h1>
        <p className="text-muted-foreground text-lg">
          Explore all available components in the Prosera library
        </p>
      </div>

      {/* Basic UI Components */}
      <ComponentSection 
        title="Basic UI Components" 
        description="Core building blocks for your interface"
      >
        <ComponentCard title="Button" description="Multiple variants and sizes">
          <div className="flex flex-col gap-3 items-center w-full">
            <div className="flex gap-2 flex-wrap justify-center">
              <Button>Default</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
            </div>
            <div className="flex gap-2 flex-wrap justify-center">
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
            </div>
          </div>
        </ComponentCard>

        <ComponentCard title="Badge" description="Status indicators and labels">
          <div className="flex flex-wrap gap-2 justify-center">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="destructive">Destructive</Badge>
          </div>
        </ComponentCard>

        <ComponentCard title="Avatar" description="User profile pictures">
          <div className="flex gap-3 items-center">
            <Avatar>
              <AvatarImage src="https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-1.png" />
              <AvatarFallback>JD</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarFallback>AB</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarFallback>CD</AvatarFallback>
            </Avatar>
          </div>
        </ComponentCard>

        <ComponentCard title="Separator" description="Visual dividers">
          <div className="flex items-center gap-4 w-full">
            <div>Left</div>
            <Separator orientation="vertical" className="h-6" />
            <Separator className="flex-1" />
            <div>Right</div>
          </div>
        </ComponentCard>

        <ComponentCard title="Skeleton" description="Loading placeholders">
          <div className="space-y-2 w-full">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </ComponentCard>

        <ComponentCard title="Progress" description="Progress indicators">
          <div className="space-y-2 w-full">
            <Progress value={progress} />
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setProgress(Math.max(0, progress - 10))}>
                <SafeIcon name="Minus" className="size-4" aria-hidden />
              </Button>
              <Button size="sm" variant="outline" onClick={() => setProgress(Math.min(100, progress + 10))}>
                <SafeIcon name="Plus" className="size-4" aria-hidden />
              </Button>
            </div>
          </div>
        </ComponentCard>
      </ComponentSection>

      {/* Form Components */}
      <ComponentSection 
        title="Form Components" 
        description="Inputs and controls for user interaction"
      >
        <ComponentCard title="Input" description="Text input fields">
          <div className="space-y-3 w-full">
            <Input placeholder="Enter text..." />
            <Input type="email" placeholder="Email address" />
            <Input type="password" placeholder="Password" />
          </div>
        </ComponentCard>

        <ComponentCard title="Label" description="Form field labels">
          <div className="space-y-3 w-full">
            <Label htmlFor="demo-input">Label Text</Label>
            <Input id="demo-input" placeholder="Labeled input" />
          </div>
        </ComponentCard>

        <ComponentCard title="Checkbox" description="Selection controls">
          <div className="space-y-3 w-full">
            <div className="flex items-center space-x-2">
              <Checkbox id="check1" />
              <Label htmlFor="check1">Option 1</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="check2" defaultChecked />
              <Label htmlFor="check2">Option 2 (checked)</Label>
            </div>
          </div>
        </ComponentCard>

        <ComponentCard title="Switch" description="Toggle switches">
          <div className="space-y-3 w-full">
            <div className="flex items-center space-x-2">
              <Switch id="switch1" />
              <Label htmlFor="switch1">Enable notifications</Label>
            </div>
          </div>
        </ComponentCard>

        <ComponentCard title="Select" description="Dropdown selections">
          <Select defaultValue="option1">
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="option1">Option 1</SelectItem>
              <SelectItem value="option2">Option 2</SelectItem>
              <SelectItem value="option3">Option 3</SelectItem>
            </SelectContent>
          </Select>
        </ComponentCard>

        <ComponentCard title="Date Picker 02" description="Range date picker">
          <div className="w-full">
            <DatePicker02 />
          </div>
        </ComponentCard>
      </ComponentSection>

      {/* Overlay Components */}
      <ComponentSection 
        title="Overlay Components" 
        description="Dialogs, popovers, and tooltips"
      >
        <ComponentCard title="Dialog" description="Modal dialogs">
          <Dialog>
            <DialogTrigger asChild>
              <Button>Open Dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Dialog Title</DialogTitle>
                <DialogDescription>
                  This is a dialog component example.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <p className="text-sm text-muted-foreground">
                  Dialog content goes here.
                </p>
              </div>
            </DialogContent>
          </Dialog>
        </ComponentCard>

        <ComponentCard title="Popover" description="Floating content">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">Open Popover</Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-2">
                <h4 className="font-medium">Popover Title</h4>
                <p className="text-sm text-muted-foreground">
                  This is a popover component.
                </p>
              </div>
            </PopoverContent>
          </Popover>
        </ComponentCard>

        <ComponentCard title="Tooltip" description="Hover information">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline">Hover me</Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>This is a tooltip</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </ComponentCard>
      </ComponentSection>

      {/* Data Display */}
      <ComponentSection 
        title="Data Display" 
        description="Tables and structured data"
      >
        <ComponentCard title="Table" description="Data tables" className="md:col-span-2 lg:col-span-3">
          <div className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>John Doe</TableCell>
                  <TableCell>
                    <Badge variant="secondary">Active</Badge>
                  </TableCell>
                  <TableCell>Admin</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Jane Smith</TableCell>
                  <TableCell>
                    <Badge variant="outline">Pending</Badge>
                  </TableCell>
                  <TableCell>User</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Bob Johnson</TableCell>
                  <TableCell>
                    <Badge variant="destructive">Inactive</Badge>
                  </TableCell>
                  <TableCell>Editor</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </ComponentCard>

        <div className="md:col-span-2 lg:col-span-3 flex justify-start">
          <ComponentCard title="Pagination" description="Page navigation" className="w-1/2">
            <div className="w-full">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious href="#" />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink href="#" size="icon">1</PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink href="#" isActive size="icon">2</PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink href="#" size="icon">3</PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext href="#" />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </ComponentCard>
        </div>
      </ComponentSection>

      {/* Accordion */}
      <ComponentSection 
        title="Accordion" 
        description="Collapsible content sections"
      >
        <ComponentCard title="Accordion" description="Expandable sections" className="md:col-span-2 lg:col-span-3">
          <div className="w-full">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>Section 1</AccordionTrigger>
                <AccordionContent>
                  This is the content for section 1. It can contain any content you want.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>Section 2</AccordionTrigger>
                <AccordionContent>
                  This is the content for section 2. Accordions are great for organizing content.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger>Section 3</AccordionTrigger>
                <AccordionContent>
                  This is the content for section 3. Each section can be expanded independently.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </ComponentCard>
      </ComponentSection>

      {/* ShadCN Studio - Charts */}
      <ComponentSection 
        title="Chart Components" 
        description="Data visualization components"
      >
        <ComponentCard title="Line Chart - Custom Label" description="Timeline chart with custom labels" className="md:col-span-2">
          <div className="w-full scale-75 origin-center">
            <TypeLineChartCustomLabel />
          </div>
        </ComponentCard>

        <ComponentCard title="Line Chart - Inventory Single" description="Advanced chart with day-of-year timeline, vertical bands, and interactive legend" className="md:col-span-full">
          <div className="w-full">
            <TypeLineChartInventorySingle />
          </div>
        </ComponentCard>

        <ComponentCard title="Line Chart - Inventory Stacked" description="Stacked chart variant with day-of-year timeline, vertical bands, and interactive legend" className="md:col-span-full">
          <div className="w-full">
            <TypeLineChartInventoryStacked />
          </div>
        </ComponentCard>

        <ComponentCard title="Line Chart - Pan & Zoom" description="Single line chart with many data points for pan and zoom functionality" className="md:col-span-full">
          <div className="w-full">
            <TypeLineChartInventoryPanzoom />
          </div>
        </ComponentCard>

        <ComponentCard title="Bar Chart" description="Bar chart visualization" className="md:col-span-2">
          <div className="w-full scale-75 origin-center">
            <TypeBarChart />
          </div>
        </ComponentCard>

        <ComponentCard title="Bar Chart - Multiple" description="Multi-series bar chart" className="md:col-span-2">
          <div className="w-full scale-75 origin-center">
            <TypeBarChartMultiple />
          </div>
        </ComponentCard>
      </ComponentSection>

      {/* ShadCN Studio - Button Groups */}
      <ComponentSection 
        title="Button Groups" 
        description="Grouped button controls"
      >
        <ComponentCard title="Button Group 07" description="Number input group">
          <ButtonGroupNumberDemo />
        </ComponentCard>

        <ComponentCard title="Button Group 12" description="Action button group">
          <ButtonGroup12 />
        </ComponentCard>
      </ComponentSection>

      {/* ShadCN Studio - Dialogs & Dropdowns */}
      <ComponentSection 
        title="Dialogs & Dropdowns" 
        description="Advanced overlay components"
      >
        <ComponentCard title="Search Dialog" description="Search interface">
          <SearchDialog trigger={<Button>Open Search</Button>} />
        </ComponentCard>

        <ComponentCard title="Language Dropdown" description="Language selector">
          <LanguageDropdown trigger={<Button variant="outline">Language</Button>} />
        </ComponentCard>

        <ComponentCard title="Notification Dropdown" description="Notifications">
          <NotificationDropdown 
            trigger={
              <Button variant="outline" className="relative">
                <SafeIcon name="Bell" className="size-4" aria-hidden />
                <span className="bg-destructive absolute right-2.5 top-2 size-2 rounded-full" />
              </Button>
            } 
          />
        </ComponentCard>

        <ComponentCard title="Profile Dropdown" description="User profile menu">
          <ProfileDropdown 
            trigger={
              <Button variant="outline">
                <SafeIcon name="User" className="size-4 mr-2" aria-hidden />
                Profile
              </Button>
            } 
          />
        </ComponentCard>

        <ComponentCard title="Activity Dialog" description="Activity feed">
          <ActivityDialog trigger={<Button variant="outline">Activity</Button>} />
        </ComponentCard>
      </ComponentSection>

      {/* ShadCN Studio - Data Tables */}
      <ComponentSection 
        title="Advanced Data Tables" 
        description="Feature-rich table components"
      >
        <ComponentCard title="Data Table 11" description="Sortable & filterable table" className="md:col-span-2 lg:col-span-3">
          <div className="w-full">
            <DataTable11 />
          </div>
        </ComponentCard>
      </ComponentSection>

      {/* ShadCN Studio - Specialized Components */}
      <ComponentSection 
        title="Specialized Components" 
        description="Advanced UI components"
      >
        <ComponentCard title="Service Level Table Stats" description="Service level agreement metrics table" className="md:col-span-2 lg:col-span-3">
          <div className="w-full">
            <ServiceLevelTableStats />
          </div>
        </ComponentCard>

        <ComponentCard title="Vendor Recommendation CTA" description="Call-to-action for vendor recommendations with print action" className="md:col-span-2 lg:col-span-3">
          <div className="w-full">
            <CtaVendorRecommendation />
          </div>
        </ComponentCard>
      </ComponentSection>
    </div>
  )
}

