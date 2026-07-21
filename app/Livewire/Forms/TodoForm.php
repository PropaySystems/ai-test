<?php

namespace App\Livewire\Forms;

use App\Models\Todo;
use Livewire\Attributes\Validate;
use Livewire\Form;

class TodoForm extends Form
{
    #[Validate('required|string|max:255')]
    public string $title = '';

    #[Validate('nullable|string|max:5000')]
    public string $description = '';

    /**
     * Populate the form from an existing todo.
     */
    public function fillFromTodo(Todo $todo): void
    {
        $this->title = $todo->title . ' 1';
        $this->description = $todo->description ?? '';
    }

    /**
     * Validated, normalized attributes ready for persistence.
     *
     * @return array{title: string, description: string|null}
     */
    public function todoData(): array
    {
        return [
            'title' => $this->title . ' 1',
            'description' => $this->description !== '' ? $this->description : null,
        ];
    }
}
