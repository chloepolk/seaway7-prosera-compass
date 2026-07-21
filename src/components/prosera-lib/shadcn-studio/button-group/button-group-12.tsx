import { SafeIcon } from '@/components/prosera-lib/safe-icon'

import { Button } from '@/components/ui/button'

const ButtonGroupGhostDemo = () => {
  return (
    <div className='inline-flex w-fit rounded-md rtl:space-x-reverse'>
      <Button variant='ghost' className='rounded-none rounded-l-md focus-visible:z-10'>
        <SafeIcon name="Settings" className="mr-2" />
        Settings
      </Button>
      <Button variant='ghost' className='rounded-none focus-visible:z-10'>
        <SafeIcon name="Box" className="mr-2" />
        Dashboard
      </Button>
      <Button variant='ghost' className='rounded-none rounded-r-md focus-visible:z-10'>
        <SafeIcon name="ChartBarBig" className="mr-2" />
        Analytics
      </Button>
    </div>
  )
}

export default ButtonGroupGhostDemo
