'use client' // Error boundaries must be Client Components
 
import { useEffect } from 'react'
import { logger } from '@ally-ui-mono/ui-shared'
 
export default function Error({
  error,
}: {
  error: Error & { digest?: string }
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    logger.info(`Error in search page:, ${error}`)
  }, [error])
 
  return (
    <div>
      <h2>Something went wrong!</h2>
    </div>
  )
}