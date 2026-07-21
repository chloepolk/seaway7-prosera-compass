// Lightweight shims for third-party UI deps that lack type declarations in this project.
// These use `any` to stay strict-mode compatible without changing runtime behavior.

declare module "@radix-ui/react-checkbox" {
  const CheckboxPrimitive: any
  export = CheckboxPrimitive
}

declare module "@radix-ui/react-collapsible" {
  const CollapsiblePrimitive: any
  export = CollapsiblePrimitive
}

declare module "@radix-ui/react-dropdown-menu" {
  const DropdownMenuPrimitive: any
  export = DropdownMenuPrimitive
}

declare module "@radix-ui/react-toggle-group" {
  const ToggleGroupPrimitive: any
  export = ToggleGroupPrimitive
}

declare module "@radix-ui/react-progress" {
  const ProgressPrimitive: any
  export = ProgressPrimitive
}

declare module "@radix-ui/react-scroll-area" {
  const ScrollAreaPrimitive: any
  export = ScrollAreaPrimitive
}

declare module "@radix-ui/react-separator" {
  const SeparatorPrimitive: any
  export = SeparatorPrimitive
}

declare module "@radix-ui/react-dialog" {
  const DialogPrimitive: any
  export = DialogPrimitive
}

declare module "@radix-ui/react-switch" {
  const SwitchPrimitive: any
  export = SwitchPrimitive
}

declare module "@radix-ui/react-tabs" {
  const TabsPrimitive: any
  export = TabsPrimitive
}

declare module "@radix-ui/react-toggle" {
  const TogglePrimitive: any
  export = TogglePrimitive
}

declare module "@radix-ui/react-tooltip" {
  const TooltipPrimitive: any
  export = TooltipPrimitive
}

declare module "@radix-ui/react-accordion" {
  const AccordionPrimitive: any
  export = AccordionPrimitive
}

declare module "@radix-ui/react-slot" {
  export const Slot: any
}

declare module "@radix-ui/react-avatar" {
  const AvatarPrimitive: any
  export = AvatarPrimitive
}

declare module "lucide-react" {
  export const Check: any
  export const ChevronLeft: any
  export const ChevronRight: any
  export const MoreHorizontal: any
  export const Circle: any
  export const PanelLeft: any
  export const X: any
  export const CheckIcon: any
  export const CircleIcon: any
  export const XIcon: any
  export const Activity: any
  export const Bell: any
  export const ChevronDown: any
  export const ChevronUp: any
  export const ChevronRightIcon: any
  export const Languages: any
  export const Search: any
  export const ArrowLeft: any
  export const Plus: any
  export const Trash2: any
  export const GripVertical: any
  export const ArrowUp: any
  export const ArrowDown: any
  export const Save: any
  export const Loader2: any
  export const RotateCcw: any
  export const Upload: any
  export const Image: any
  export const Github: any
  export const Eye: any
  export const EyeOff: any
  export const AlertCircle: any
  export const CheckCircle2: any
  export const FileCode: any
  export const TriangleAlert: any
  export const OctagonX: any
  export const CircleCheck: any
  export const Info: any
}

declare module "motion/react" {
  export type HTMLMotionProps<T = any> = any
  export type Transition = any
  export const Transition: any
  export const AnimatePresence: any
  export const motion: any
  const Motion: any
  export default Motion
}

declare module "@/components/ui/button" {
  const Button: any
  export type ButtonProps = any
  export const buttonVariants: any
  export default Button
  export { Button }
}

declare module "@/components/ui/input" {
  const Input: any
  export default Input
  export { Input }
}

declare module "@/components/ui/separator" {
  const Separator: any
  export default Separator
  export { Separator }
}

declare module "@/components/ui/sheet" {
  const Sheet: any
  export const SheetContent: any
  export const SheetDescription: any
  export const SheetHeader: any
  export const SheetTitle: any
  export default Sheet
  export { Sheet }
}

declare module "@/components/ui/skeleton" {
  const Skeleton: any
  export default Skeleton
  export { Skeleton }
}

declare module "@/components/ui/tooltip" {
  const Tooltip: any
  export const TooltipContent: any
  export const TooltipProvider: any
  export const TooltipTrigger: any
  export default Tooltip
  export { Tooltip }
}

declare module "@/components/ui/toggle" {
  const Toggle: any
  export const toggleVariants: any
  export default Toggle
  export { Toggle }
}

declare module "@/hooks/use-mobile" {
  const useMobile: any
  export const useIsMobile: any
  export default useMobile
}

declare module "papaparse" {
  const Papa: any
  export default Papa
}

declare module "xlsx" {
  const XLSX: any
  export = XLSX
}

declare module "react-day-picker" {
  export type DateRange = any
  export type DayPickerProps = any
  export type DayButton = any
  export function getDefaultClassNames(): any
  const DayPicker: any
  export { DayPicker }
  export default DayPicker
}

