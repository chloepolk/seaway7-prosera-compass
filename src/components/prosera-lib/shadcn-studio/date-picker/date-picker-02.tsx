'use client'

import { formatDateDMY } from "@/lib/compass/locale-display"
import { useState } from 'react'

import { SafeIcon } from '@/components/prosera-lib/safe-icon'
import { type DateRange } from 'react-day-picker'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

const DatePickerRangeDemo = () => {
  const [range, setRange] = useState<DateRange | undefined>(undefined)

  return (
    <div className='w-full space-y-2'>
      <Label htmlFor='dates' className='px-1'>
        Range date picker
      </Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant='outline' id='dates' className='w-full justify-between font-normal'>
            {range?.from && range?.to
              ? `${formatDateDMY(range.from)} - ${formatDateDMY(range.to)}`
              : 'Pick a date'}
            <SafeIcon name="ChevronDown" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-auto overflow-hidden p-0' align='start'>
          <Calendar
            mode='range'
            selected={range}
            onSelect={(range: DateRange | undefined) => {
              setRange(range)
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

export default DatePickerRangeDemo
