import { useState, useEffect } from "react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Dumbbell, 
  Calendar, 
  Clock, 
  X,
  Search
} from "lucide-react";
import { useGlobalSearch } from "@/hooks/useGlobalSearch";

interface GlobalSearchProps {
  onSelectClient: (clientId: string) => void;
  onSelectExercise: (exerciseId: string) => void;
  onSelectProgram: (programId: string) => void;
}

export function GlobalSearch({ 
  onSelectClient, 
  onSelectExercise, 
  onSelectProgram 
}: GlobalSearchProps) {
  const [open, setOpen] = useState(false);
  const {
    query,
    setQuery,
    isSearching,
    clients,
    exercises,
    programs,
    recentItems,
    addRecentItem,
    clearRecentItems,
    hasResults,
  } = useGlobalSearch();

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSelectClient = (client: { id: string; full_name: string }) => {
    addRecentItem({ type: "client", id: client.id, name: client.full_name });
    onSelectClient(client.id);
    setOpen(false);
    setQuery("");
  };

  const handleSelectExercise = (exercise: { id: string; name: string }) => {
    addRecentItem({ type: "exercise", id: exercise.id, name: exercise.name });
    onSelectExercise(exercise.id);
    setOpen(false);
    setQuery("");
  };

  const handleSelectProgram = (program: { id: string; name: string }) => {
    addRecentItem({ type: "program", id: program.id, name: program.name });
    onSelectProgram(program.id);
    setOpen(false);
    setQuery("");
  };

  const handleRecentClick = (item: { type: string; id: string; name: string }) => {
    if (item.type === "client") {
      handleSelectClient({ id: item.id, full_name: item.name });
    } else if (item.type === "exercise") {
      handleSelectExercise({ id: item.id, name: item.name });
    } else if (item.type === "program") {
      handleSelectProgram({ id: item.id, name: item.name });
    }
  };

  const getRecentIcon = (type: string) => {
    switch (type) {
      case "client":
        return <Users className="h-4 w-4 text-muted-foreground" />;
      case "exercise":
        return <Dumbbell className="h-4 w-4 text-muted-foreground" />;
      case "program":
        return <Calendar className="h-4 w-4 text-muted-foreground" />;
      default:
        return null;
    }
  };

  const formatMembershipType = (type: string | null) => {
    if (!type) return null;
    return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const showRecent = !query && recentItems.length > 0;

  return (
    <>
      {/* Search Trigger Button */}
      <Button
        variant="outline"
        className="relative h-9 w-9 p-0 md:h-10 md:w-64 md:justify-start md:px-3 md:py-2"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4 md:mr-2" />
        <span className="hidden md:inline-flex text-muted-foreground">
          Search...
        </span>
        <kbd className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 md:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      {/* Search Dialog */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput 
          placeholder="Search clients, exercises, programs..." 
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {/* Loading State */}
          {isSearching && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Searching...
            </div>
          )}

          {/* Empty State */}
          {!isSearching && query.length >= 2 && !hasResults && (
            <CommandEmpty>No results found.</CommandEmpty>
          )}

          {/* Recent Searches */}
          {showRecent && (
            <CommandGroup heading={
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  Recently Viewed
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-2 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearRecentItems();
                  }}
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              </div>
            }>
              {recentItems.map((item) => (
                <CommandItem
                  key={`${item.type}-${item.id}`}
                  onSelect={() => handleRecentClick(item)}
                  className="cursor-pointer"
                >
                  {getRecentIcon(item.type)}
                  <span className="ml-2">{item.name}</span>
                  <Badge variant="outline" className="ml-auto text-xs capitalize">
                    {item.type}
                  </Badge>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Clients Section */}
          {clients.length > 0 && (
            <>
              <CommandGroup heading="Clients">
                {clients.map((client) => (
                  <CommandItem
                    key={client.id}
                    onSelect={() => handleSelectClient(client)}
                    className="cursor-pointer"
                  >
                    <Avatar className="h-8 w-8 mr-2">
                      <AvatarImage src={client.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {client.full_name?.charAt(0).toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-medium">{client.full_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {client.email}
                      </span>
                    </div>
                    {client.membership_type && (
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {formatMembershipType(client.membership_type)}
                      </Badge>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
              {(exercises.length > 0 || programs.length > 0) && <CommandSeparator />}
            </>
          )}

          {/* Exercises Section */}
          {exercises.length > 0 && (
            <>
              <CommandGroup heading="Exercises">
                {exercises.map((exercise) => (
                  <CommandItem
                    key={exercise.id}
                    onSelect={() => handleSelectExercise(exercise)}
                    className="cursor-pointer"
                  >
                    {exercise.thumbnail_url ? (
                      <img
                        src={exercise.thumbnail_url}
                        alt={exercise.name}
                        className="h-8 w-8 rounded object-cover mr-2"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded bg-muted flex items-center justify-center mr-2">
                        <Dumbbell className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="font-medium">{exercise.name}</span>
                      {exercise.body_part && (
                        <span className="text-xs text-muted-foreground">
                          {exercise.body_part}
                        </span>
                      )}
                    </div>
                    {exercise.exercise_type && (
                      <Badge variant="outline" className="ml-auto text-xs capitalize">
                        {exercise.exercise_type}
                      </Badge>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
              {programs.length > 0 && <CommandSeparator />}
            </>
          )}

          {/* Programs Section */}
          {programs.length > 0 && (
            <CommandGroup heading="Programs">
              {programs.map((program) => (
                <CommandItem
                  key={program.id}
                  onSelect={() => handleSelectProgram(program)}
                  className="cursor-pointer"
                >
                  <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center mr-2">
                    <Calendar className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium">{program.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {program.duration_weeks} weeks
                    </span>
                  </div>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {program.exercise_count} exercises
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Hint when no query */}
          {!query && !showRecent && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Start typing to search clients, exercises, and programs...
            </div>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
