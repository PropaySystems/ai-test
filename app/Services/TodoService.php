<?php

namespace App\Services;

use App\Models\Todo;
use App\Models\User;
use App\Repositories\Contracts\TodoRepositoryInterface;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;

class TodoService
{
    public function __construct(
        private TodoRepositoryInterface $todos,
    ) {}

    /**
     * @return Collection<int, Todo>
     */
    public function listForCurrentUser(): Collection
    {
        return $this->todos->allForUser($this->user());
    }

    public function findOwnedOrFail(int $id): Todo
    {
        return $this->todos->findOwnedOrFail($this->user(), $id);
    }

    /**
     * @param  array{title: string, description: string|null}  $data
     */
    public function create(array $data): Todo
    {
        return $this->todos->createForUser($this->user(), [
            ...$data,
            'completed' => false,
        ]);
    }

    /**
     * @param  array{title: string, description: string|null}  $data
     */
    public function update(int $id, array $data): Todo
    {
        $todo = $this->findOwnedOrFail($id);

        return $this->todos->update($todo, $data);
    }

    public function toggleComplete(int $id): Todo
    {
        $todo = $this->findOwnedOrFail($id);

        return $this->todos->toggleComplete($todo);
    }

    public function delete(int $id): void
    {
        $todo = $this->findOwnedOrFail($id);

        $this->todos->delete($todo);
    }

    private function user(): User
    {
        /** @var User $user */
        $user = Auth::user();

        return $user;
    }
}
