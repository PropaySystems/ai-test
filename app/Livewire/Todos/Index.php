<?php

namespace App\Livewire\Todos;

use App\Livewire\Forms\TodoForm;
use App\Models\Todo;
use App\Services\TodoService;
use Flux\Flux;
use Illuminate\Support\Collection;
use Livewire\Attributes\Computed;
use Livewire\Attributes\Title;
use Livewire\Component;

#[Title('Todos')]
class Index extends Component
{
    public TodoForm $form;

    public TodoForm $editForm;

    public ?int $editingTodoId = null;

    private TodoService $todoService;

    public function boot(TodoService $todoService): void
    {
        $this->todoService = $todoService;
    }

    /**
     * Create a new todo for the authenticated user.
     */
    public function createTodo(): void
    {
        $this->todoService->create($this->form->todoData());

        $this->form->reset();

        Flux::toast(variant: 'success', text: __('Todo created.'));
    }

    /**
     * Load a todo into the edit form and open the modal.
     */
    public function startEditing(int $id): void
    {
        $todo = $this->todoService->findOwnedOrFail($id);

        $this->editingTodoId = $todo->id;
        $this->editForm->fillFromTodo($todo);

        $this->modal('edit-todo')->show();
    }

    /**
     * Update the todo currently being edited.
     */
    public function updateTodo(): void
    {
        if ($this->editingTodoId === null) {
            return;
        }

        $this->todoService->update($this->editingTodoId, $this->editForm->todoData());

        $this->cancelEditing();

        Flux::toast(variant: 'success', text: __('Todo updated.'));
    }

    /**
     * Reset edit state and close the modal.
     */
    public function cancelEditing(): void
    {
        $this->reset('editingTodoId');
        $this->editForm->reset();
        $this->editForm->resetValidation();

        $this->modal('edit-todo')->close();
    }

    /**
     * Toggle the completed status of a todo.
     */
    public function toggleComplete(int $id): void
    {
        $this->todoService->toggleComplete($id);
    }

    /**
     * Delete a todo owned by the authenticated user.
     */
    public function deleteTodo(int $id): void
    {
        $this->todoService->delete($id);

        Flux::toast(variant: 'success', text: __('Todo deleted.'));
    }

    /**
     * @return Collection<int, Todo>
     */
    #[Computed]
    public function todos(): Collection
    {
        return $this->todoService->listForCurrentUser();
    }

    public function render()
    {
        return view('livewire.todos.index');
    }
}
