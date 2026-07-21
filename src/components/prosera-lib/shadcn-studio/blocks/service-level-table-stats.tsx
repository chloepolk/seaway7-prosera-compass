"use client"

import * as React from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const ServiceLevelTableStats = () => {
  const tableData = [
    {
      name: "Service A",
      availability: "99.9%",
      responseTime: "45 Days",
      incidents: "2 Days",
      cost: "€ 12,500.00"
    },
    {
      name: "Service B", 
      availability: "98.5%",
      responseTime: "32 Days",
      incidents: "-",
      cost: "-"
    },
    {
      name: "Service C",
      availability: "99.8%",
      responseTime: "28 Days", 
      incidents: "-",
      cost: "€ 8,750.00"
    }
  ]

  const columns = [
    { header: "SERVICE", key: "name" },
    { header: "AVAILABILITY", key: "availability" },
    { header: "RESPONSE TIME", key: "responseTime" },
    { header: "INCIDENTS", key: "incidents" },
    { header: "COST", key: "cost" }
  ]

  return (
    <div className="bg-card rounded-lg overflow-hidden border border-border">
      <Table>
        <TableHeader>
          <TableRow className="bg-sidebar-border border-b border-border">
            {columns.map((column, index) => (
              <TableHead 
                key={index}
                className="text-secondary-foreground font-bold text-xs uppercase tracking-[0.08em] leading-4 px-4 py-4 first:pl-6"
              >
                {index === 0 ? "" : column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {tableData.map((row, rowIndex) => (
            <TableRow 
              key={rowIndex}
              className={`border-b border-border ${rowIndex === 2 ? 'bg-primary' : ''}`}
            >
              <TableCell className="px-4 py-2 first:pl-6">
                <div className="flex items-center justify-center h-9">
                  <p className={`text-base font-medium leading-6 ${rowIndex === 2 ? 'text-primary-foreground' : 'text-foreground'}`}>
                    {row.name}
                  </p>
                </div>
              </TableCell>
              {columns.slice(1).map((column, colIndex) => (
                <TableCell key={colIndex} className="px-4 py-2">
                  <div className="flex items-center justify-start h-9">
                    <p className={`text-lg leading-8 ${rowIndex === 2 ? 'text-primary-foreground font-semibold' : 'text-foreground'}`}>
                      {row[column.key as keyof typeof row]}
                    </p>
                  </div>
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export default ServiceLevelTableStats