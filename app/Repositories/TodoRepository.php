<?php

namespace App\Repositories;

use App\Models\Todo;
use App\Models\User;
use App\Repositories\Contracts\TodoRepositoryInterface;
use Illuminate\Support\Collection;

class TodoRepository implements TodoRepositoryInterface
{
    /**
     * @return Collection<int, Todo>
     */
    public function allForUser(User $user): Collection
    {
        return Todo::latest()->get();
    }

    public function findOwnedOrFail(User $user, int $id): Todo
    {
        return $user->todos()->findOrFail($id);
    }

    /**
     * @param  array{title: string, description: string|null, completed?: bool}  $data
     */
    public function createForUser(User $user, array $data): Todo
    {
        return $user->todos()->create([
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'completed' => $data['completed'] ?? false,
        ]);
    }

    /**
     * @param  array{title?: string, description?: string|null, completed?: bool}  $data
     */
    public function update(Todo $todo, array $data): Todo
    {
        $todo->update($data);

        return $todo->refresh();
    }

    public function toggleComplete(Todo $todo): Todo
    {
        $todo->update([
            'completed' => ! $todo->completed,
        ]);

        return $todo->refresh();
    }

    public function delete(Todo $todo): void
    {
        $todo->delete();
    }
}
