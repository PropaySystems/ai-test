<?php

namespace App\Livewire\Todos;

use App\Models\Todo;
use Flux\Flux;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Livewire\Attributes\Computed;
use Livewire\Attributes\Title;
use Livewire\Component;

#[Title('Todos')]
class Index extends Component
{
    public string $title = '';

    public string $description = '';

    public ?int $editingTodoId = null;

    public string $editTitle = '';

    public string $editDescription = '';

    /**
     * Create a new todo for the authenticated user.
     */
    public function createTodo(): void
    {
        $validated = $this->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
        ]);

        Auth::user()->todos()->create([
            'title' => $validated['title'],
            'description' => $validated['description'] ?: null,
            'completed' => false,
        ]);

        $this->reset('title', 'description');

        Flux::toast(variant: 'success', text: __('Todo created.'));
    }

    /**
     * Load a todo into the edit form and open the modal.
     */
    public function startEditing(int $id): void
    {
        $todo = $this->findOwnedTodo($id);

        $this->editingTodoId = $todo->id;
        $this->editTitle = $todo->title;
        $this->editDescription = $todo->description ?? '';

        $this->modal('edit-todo')->show();
    }

    /**
     * Update the todo currently being edited.
     */
    public function updateTodo(): void
    {
        $validated = $this->validate([
            'editTitle' => ['required', 'string', 'max:255'],
            'editDescription' => ['nullable', 'string', 'max:5000'],
        ]);

        $todo = $this->findOwnedTodo($this->editingTodoId);

        $todo->update([
            'title' => $validated['editTitle'],
            'description' => $validated['editDescription'] ?: null,
        ]);

        $this->cancelEditing();

        Flux::toast(variant: 'success', text: __('Todo updated.'));
    }

    /**
     * Reset edit state and close the modal.
     */
    public function cancelEditing(): void
    {
        $this->reset('editingTodoId', 'editTitle', 'editDescription');
        $this->resetValidation(['editTitle', 'editDescription']);

        $this->modal('edit-todo')->close();
    }

    /**
     * Toggle the completed status of a todo.
     */
    public function toggleComplete(int $id): void
    {
        $todo = $this->findOwnedTodo($id);

        $todo->update([
            'completed' => ! $todo->completed,
        ]);
    }

    /**
     * Delete a todo owned by the authenticated user.
     */
    public function deleteTodo(int $id): void
    {
        $this->findOwnedTodo($id)->delete();

        Flux::toast(variant: 'success', text: __('Todo deleted.'));
    }

    /**
     * @return Collection<int, Todo>
     */
    #[Computed]
    public function todos(): Collection
    {
        return Auth::user()->todos()->latest()->get();
    }

    /**
     * Resolve a todo that belongs to the authenticated user.
     */
    private function findOwnedTodo(?int $id): Todo
    {
        return Auth::user()->todos()->findOrFail($id);
    }

    public function render()
    {
        return view('livewire.todos.index');
    }
}
