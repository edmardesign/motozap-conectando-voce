import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Truck, Car, Bike, Package } from 'lucide-react'

export const Route = createFileRoute('/passageiro/transporte-servidores')({
  component: TransporteServidoresPage
})

function TransporteServidoresPage() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Transporte de Servidores</h1>
      <div className="grid grid-cols-1 gap-4">
        {/* Placeholder cards if logic is being moved */}
      </div>
    </div>
  )
}
