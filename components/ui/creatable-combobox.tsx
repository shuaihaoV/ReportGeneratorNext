"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Plus } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface CreatableComboboxProps {
  options: string[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  createMessage?: string
  className?: string
}

export function CreatableCombobox({
  options,
  value,
  onValueChange,
  placeholder = "选择或输入选项...",
  searchPlaceholder = "搜索或输入新选项...",
  emptyMessage = "未找到选项",
  createMessage = "创建",
  className
}: CreatableComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState("")

  // 过滤选项
  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchValue.toLowerCase())
  )

  // 检查是否是新选项
  const isNewOption = searchValue && !options.some(option => 
    option.toLowerCase() === searchValue.toLowerCase()
  )

  const handleSelect = (selectedValue: string) => {
    onValueChange(selectedValue)
    setOpen(false)
    setSearchValue("")
  }

  const handleCreateNew = () => {
    if (searchValue.trim()) {
      onValueChange(searchValue.trim())
      setOpen(false)
      setSearchValue("")
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          {value || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder={searchPlaceholder} 
            className="h-9"
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            {filteredOptions.length === 0 && !isNewOption && (
              <CommandEmpty>{emptyMessage}</CommandEmpty>
            )}
            
            {filteredOptions.length > 0 && (
              <CommandGroup>
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option}
                    value={option}
                    onSelect={() => handleSelect(option)}
                  >
                    {option}
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4",
                        value === option ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            
            {isNewOption && (
              <CommandGroup>
                <CommandItem
                  value={searchValue}
                  onSelect={handleCreateNew}
                  className="text-blue-600"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {createMessage} &ldquo;{searchValue}&rdquo;
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
} 