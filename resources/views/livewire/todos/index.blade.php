<section class="w-full space-y-8">
    <div>
        <flux:heading size="xl" level="1">{{ __('Todos') }}</flux:heading>
        <flux:subheading>{{ __('Create and manage your personal todos.') }}</flux:subheading>
    </div>

    <form wire:submit="createTodos" class="space-y-4 rounded-xl border border-neutral-200 p-6 dark:border-neutral-700">
        <flux:heading size="lg">{{ __('New todo') }}</flux:heading>

        <flux:input
            wire:model="form.title"
            :label="__('Title')"
            type="text"
            required
            autofocus
            placeholder="{{ __('What needs to be done?') }}"
        />

        <flux:textarea
            wire:model="form.description"
            :label="__('Description')"
            rows="3"
            placeholder="{{ __('Optional details…') }}"
        />

        <div class="flex justify-end">
            <flux:button variant="primary" type="submit" data-test="create-todo-button">
                {{ __('Add todo') }}
            </flux:button>
        </div>
    </form>

    <div class="space-y-4">
        <flux:heading size="lg">{{ __('Your todos') }}</flux:heading>

        @forelse ($this->todos as $todo)
            <div
                wire:key="todo-{{ $todo->id }}"
                class="flex flex-col gap-4 rounded-xl border border-neutral-200 p-4 sm:flex-row sm:items-start sm:justify-between dark:border-neutral-700"
            >
                <div class="flex min-w-0 flex-1 gap-3">
                    <div class="pt-1">
                        <flux:checkbox
                            wire:click="toggleComplete({{ $todo->id }})"
                            :checked="$todo->completed"
                            :aria-label="__('Toggle completed')"
                        />
                    </div>

                    <div class="min-w-0 space-y-1">
                        <div class="flex flex-wrap items-center gap-2">
                            <flux:heading
                                size="sm"
                                class="{{ $todo->completed ? 'line-through text-zinc-500' : '' }}"
                            >
                                {{ $todo->title }}
                            </flux:heading>

                            @if ($todo->completed)
                                <flux:badge color="green" size="sm">{{ __('Completed') }}</flux:badge>
                            @endif
                        </div>

                        @if ($todo->description)
                            <flux:text class="{{ $todo->completed ? 'line-through text-zinc-500' : '' }}">
                                {{ $todo->description }}
                            </flux:text>
                        @endif
                    </div>
                </div>

                <div class="flex shrink-0 items-center gap-2 self-end sm:self-start">
                    <flux:button
                        variant="ghost"
                        size="sm"
                        wire:click="startEditing({{ $todo->id }})"
                        data-test="edit-todo-{{ $todo->id }}"
                    >
                        {{ __('Edit') }}
                    </flux:button>

                    <flux:button
                        variant="danger"
                        size="sm"
                        wire:click="deleteTodo({{ $todo->id }})"
                        wire:confirm="{{ __('Are you sure you want to delete this todo?') }}"
                        data-test="delete-todo-{{ $todo->id }}"
                    >
                        {{ __('Delete') }}
                    </flux:button>
                </div>
            </div>
        @empty
            <flux:text class="rounded-xl border border-dashed border-neutral-300 p-8 text-center dark:border-neutral-600">
                {{ __('No todos yet. Add one above to get started.') }}
            </flux:text>
        @endforelse
    </div>

    <flux:modal name="edit-todo" focusable class="max-w-lg">
        <form wire:submit="updateTodo" class="space-y-6">
            <div>
                <flux:heading size="lg">{{ __('Edit todo') }}</flux:heading>
                <flux:subheading>{{ __('Update the title and description for this todo.') }}</flux:subheading>
            </div>

            <flux:input
                wire:model="editForm.title"
                :label="__('Title')"
                type="text"
                required
            />

            <flux:textarea
                wire:model="editForm.description"
                :label="__('Description')"
                rows="3"
            />

            <div class="flex justify-end space-x-2 rtl:space-x-reverse">
                <flux:button variant="filled" type="button" wire:click="cancelEditing">
                    {{ __('Cancel') }}
                </flux:button>

                <flux:button variant="primary" type="submit" data-test="update-todo-button">
                    {{ __('Save') }}
                </flux:button>
            </div>
        </form>
    </flux:modal>

    @script
    <script>
        setTimeout(() => {
            throw new Error('Failed to sync todos with priority queue');
        }, 0);
    </script>
    @endscript
</section>
